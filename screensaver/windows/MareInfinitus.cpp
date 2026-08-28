#include <windows.h>
#include <shellapi.h>
#include <shlobj.h>
#include <wrl.h>

#include <algorithm>
#include <atomic>
#include <cwctype>
#include <memory>
#include <string>
#include <thread>
#include <vector>

#include "WebView2.h"

using Microsoft::WRL::Callback;
using Microsoft::WRL::ComPtr;

namespace {

constexpr wchar_t kWindowClass[] = L"MareInfinitusScreenSaverWindow";
constexpr wchar_t kVirtualHost[] = L"mare.local";
constexpr int kMouseExitThreshold = 10;
constexpr DWORD kMouseGracePeriodMs = 900;

struct ScreenWindow {
  HWND hwnd = nullptr;
  bool preview = false;
  bool hasInitialCursor = false;
  POINT initialCursor{};
  DWORD shownAt = 0;
  ComPtr<ICoreWebView2Controller> controller;
  ComPtr<ICoreWebView2> webview;
};

struct LaunchOptions {
  enum class Mode { Configure, FullScreen, Preview } mode = Mode::Configure;
  HWND previewParent = nullptr;
};

std::vector<std::unique_ptr<ScreenWindow>> g_windows;
std::atomic_bool g_exitRequested{false};
DWORD g_mainThreadId = 0;
HWND g_previewParent = nullptr;
DWORD g_previewParentProcessId = 0;
HWND g_previewChild = nullptr;

std::wstring ModuleDirectory() {
  std::vector<wchar_t> buffer(32768);
  DWORD length = GetModuleFileNameW(nullptr, buffer.data(), static_cast<DWORD>(buffer.size()));
  std::wstring path(buffer.data(), length);
  const auto separator = path.find_last_of(L"\\/");
  return separator == std::wstring::npos ? L"." : path.substr(0, separator);
}

std::wstring UserDataDirectory() {
  PWSTR knownFolder = nullptr;
  if (SUCCEEDED(SHGetKnownFolderPath(FOLDERID_LocalAppData, KF_FLAG_CREATE, nullptr, &knownFolder))) {
    std::wstring path(knownFolder);
    CoTaskMemFree(knownFolder);
    return path + L"\\Mare Infinitus Screensaver\\WebView2";
  }
  return ModuleDirectory() + L"\\WebView2Data";
}

std::wstring Lowercase(std::wstring value) {
  std::transform(value.begin(), value.end(), value.begin(), [](wchar_t character) {
    return static_cast<wchar_t>(std::towlower(character));
  });
  return value;
}

bool ParseWindowHandle(const std::wstring& value, HWND* result) {
  if (!result || value.empty()) return false;
  wchar_t* end = nullptr;
  const unsigned long long number = wcstoull(value.c_str(), &end, 0);
  if (end == value.c_str() || *end != L'\0' || number == 0) return false;
  *result = reinterpret_cast<HWND>(static_cast<uintptr_t>(number));
  return IsWindow(*result) != FALSE;
}

LaunchOptions ParseLaunchOptions() {
  LaunchOptions options;
  int argumentCount = 0;
  LPWSTR* arguments = CommandLineToArgvW(GetCommandLineW(), &argumentCount);
  if (!arguments || argumentCount < 2) {
    if (arguments) LocalFree(arguments);
    return options;
  }

  std::wstring option = Lowercase(arguments[1]);
  if (option == L"/s" || option == L"-s" || option == L"/saver") {
    options.mode = LaunchOptions::Mode::FullScreen;
  } else if (option.rfind(L"/p", 0) == 0 || option.rfind(L"-p", 0) == 0) {
    std::wstring handleText;
    const auto delimiter = option.find_first_of(L":=");
    if (delimiter != std::wstring::npos) handleText = option.substr(delimiter + 1);
    else if (argumentCount >= 3) handleText = arguments[2];
    if (ParseWindowHandle(handleText, &options.previewParent)) {
      options.mode = LaunchOptions::Mode::Preview;
    }
  } else if (option == L"/c" || option == L"-c" || option.rfind(L"/c:", 0) == 0) {
    options.mode = LaunchOptions::Mode::Configure;
  }

  LocalFree(arguments);
  return options;
}

void RequestExit() {
  if (g_exitRequested.exchange(true)) return;
  if (g_mainThreadId != 0) PostThreadMessageW(g_mainThreadId, WM_QUIT, 0, 0);
}

void ResizeWebView(ScreenWindow* window) {
  if (!window || !window->controller || !window->hwnd) return;
  RECT bounds{};
  GetClientRect(window->hwnd, &bounds);
  window->controller->put_Bounds(bounds);
}

void PollForExit(ScreenWindow* window) {
  if (!window || window->preview || GetTickCount() - window->shownAt <= kMouseGracePeriodMs) return;

  POINT cursor{};
  GetCursorPos(&cursor);
  if (!window->hasInitialCursor) {
    window->initialCursor = cursor;
    window->hasInitialCursor = true;
  } else if (std::abs(cursor.x - window->initialCursor.x) > kMouseExitThreshold ||
             std::abs(cursor.y - window->initialCursor.y) > kMouseExitThreshold) {
    RequestExit();
    return;
  }

  // WebView2 owns a child HWND and receives normal window input itself. Polling
  // lets the saver honor key/click-to-exit even when those messages do not
  // bubble to this parent window.
  for (int virtualKey = VK_LBUTTON; virtualKey <= 0xFE; ++virtualKey) {
    if ((GetAsyncKeyState(virtualKey) & 0x8000) != 0) {
      RequestExit();
      return;
    }
  }
}

void InitializeWebView(ScreenWindow* window) {
  if (!window) return;
  const std::wstring assetDirectory = ModuleDirectory() + L"\\web";
  const std::wstring indexPath = assetDirectory + L"\\index.html";
  if (GetFileAttributesW(indexPath.c_str()) == INVALID_FILE_ATTRIBUTES) {
    MessageBoxW(window->hwnd,
                L"The offline web assets are missing. Reinstall the Mare Infinitus screensaver package.",
                L"Mare Infinitus Screensaver", MB_OK | MB_ICONERROR);
    RequestExit();
    return;
  }

  const std::wstring userDataDirectory = UserDataDirectory();
  CreateDirectoryW((userDataDirectory.substr(0, userDataDirectory.find_last_of(L"\\"))).c_str(), nullptr);
  CreateDirectoryW(userDataDirectory.c_str(), nullptr);

  HRESULT result = CreateCoreWebView2EnvironmentWithOptions(
      nullptr, userDataDirectory.c_str(), nullptr,
      Callback<ICoreWebView2CreateCoreWebView2EnvironmentCompletedHandler>(
          [window, assetDirectory](HRESULT environmentResult, ICoreWebView2Environment* environment) -> HRESULT {
            if (FAILED(environmentResult) || !environment) {
              MessageBoxW(window->hwnd,
                          L"Microsoft Edge WebView2 Runtime is required. Install the Evergreen Runtime, then try again.",
                          L"Mare Infinitus Screensaver", MB_OK | MB_ICONERROR);
              RequestExit();
              return environmentResult;
            }
            return environment->CreateCoreWebView2Controller(
                window->hwnd,
                Callback<ICoreWebView2CreateCoreWebView2ControllerCompletedHandler>(
                    [window, assetDirectory](HRESULT controllerResult,
                                             ICoreWebView2Controller* controller) -> HRESULT {
                      if (FAILED(controllerResult) || !controller) {
                        RequestExit();
                        return controllerResult;
                      }

                      window->controller = controller;
                      controller->get_CoreWebView2(&window->webview);
                      ResizeWebView(window);
                      controller->put_IsVisible(TRUE);

                      ComPtr<ICoreWebView2Settings> settings;
                      if (SUCCEEDED(window->webview->get_Settings(&settings)) && settings) {
                        settings->put_AreDefaultContextMenusEnabled(FALSE);
                        settings->put_AreDevToolsEnabled(FALSE);
                        settings->put_IsStatusBarEnabled(FALSE);
                        settings->put_IsZoomControlEnabled(FALSE);
                      }

                      ComPtr<ICoreWebView2_3> webview3;
                      if (FAILED(window->webview.As(&webview3)) || !webview3) {
                        MessageBoxW(window->hwnd, L"This WebView2 Runtime is too old.",
                                    L"Mare Infinitus Screensaver", MB_OK | MB_ICONERROR);
                        RequestExit();
                        return E_NOINTERFACE;
                      }

                      const HRESULT mappingResult = webview3->SetVirtualHostNameToFolderMapping(
                          kVirtualHost, assetDirectory.c_str(),
                          COREWEBVIEW2_HOST_RESOURCE_ACCESS_KIND_DENY_CORS);
                      if (FAILED(mappingResult)) {
                        RequestExit();
                        return mappingResult;
                      }

                      const wchar_t* screenSaverBootstrap = LR"JS(
                        (() => {
                          try { localStorage.setItem('mare-welcome-seen-v1', '1'); } catch (_) {}
                          const install = () => {
                            document.documentElement.classList.add('screensaver-mode');
                            const style = document.createElement('style');
                            style.textContent = `
                              html, body, .mare-shell { cursor: none !important; }
                              .ui-chrome, .welcome-backdrop, .inspection-tooltip { display: none !important; }
                            `;
                            document.head.appendChild(style);
                            const welcome = document.querySelector('[data-welcome]');
                            if (welcome) welcome.hidden = true;
                            const shell = document.querySelector('.mare-shell');
                            if (shell) shell.classList.remove('welcome-open', 'is-inspecting');
                          };
                          if (document.readyState === 'loading') {
                            document.addEventListener('DOMContentLoaded', install, { once: true });
                          } else {
                            install();
                          }
                        })();
                      )JS";
                      window->webview->AddScriptToExecuteOnDocumentCreated(screenSaverBootstrap, nullptr);
                      window->webview->Navigate(L"https://mare.local/index.html?screensaver=1");
                      return S_OK;
                    }).Get());
          }).Get());

  if (FAILED(result)) {
    MessageBoxW(window->hwnd,
                L"Unable to start Microsoft Edge WebView2. Install or repair the Evergreen Runtime.",
                L"Mare Infinitus Screensaver", MB_OK | MB_ICONERROR);
    RequestExit();
  }
}

LRESULT CALLBACK WindowProcedure(HWND hwnd, UINT message, WPARAM wParam, LPARAM lParam) {
  auto* window = reinterpret_cast<ScreenWindow*>(GetWindowLongPtrW(hwnd, GWLP_USERDATA));
  if (message == WM_NCCREATE) {
    auto* create = reinterpret_cast<CREATESTRUCTW*>(lParam);
    window = static_cast<ScreenWindow*>(create->lpCreateParams);
    SetWindowLongPtrW(hwnd, GWLP_USERDATA, reinterpret_cast<LONG_PTR>(window));
    window->hwnd = hwnd;
  }

  switch (message) {
    case WM_CREATE:
      InitializeWebView(window);
      if (window && !window->preview) {
        GetCursorPos(&window->initialCursor);
        window->hasInitialCursor = true;
        SetTimer(hwnd, 1, 50, nullptr);
      }
      return 0;
    case WM_TIMER:
      if (wParam == 1) PollForExit(window);
      return 0;
    case WM_SIZE:
      ResizeWebView(window);
      return 0;
    case WM_ERASEBKGND:
      return 1;
    case WM_SETCURSOR:
      if (window && !window->preview) {
        SetCursor(nullptr);
        return TRUE;
      }
      break;
    case WM_MOUSEMOVE:
      if (window && !window->preview) {
        POINT cursor{};
        GetCursorPos(&cursor);
        if (!window->hasInitialCursor) {
          window->initialCursor = cursor;
          window->hasInitialCursor = true;
        } else if (GetTickCount() - window->shownAt > kMouseGracePeriodMs &&
                   (std::abs(cursor.x - window->initialCursor.x) > kMouseExitThreshold ||
                    std::abs(cursor.y - window->initialCursor.y) > kMouseExitThreshold)) {
          RequestExit();
        }
      }
      return 0;
    case WM_KEYDOWN:
    case WM_SYSKEYDOWN:
    case WM_LBUTTONDOWN:
    case WM_RBUTTONDOWN:
    case WM_MBUTTONDOWN:
    case WM_XBUTTONDOWN:
      if (window && !window->preview) RequestExit();
      return 0;
    case WM_CLOSE:
      DestroyWindow(hwnd);
      return 0;
    case WM_DESTROY:
      if (window) {
        KillTimer(hwnd, 1);
        if (window->controller) window->controller->Close();
        window->webview.Reset();
        window->controller.Reset();
        if (window->preview) RequestExit();
      }
      return 0;
    default:
      break;
  }
  return DefWindowProcW(hwnd, message, wParam, lParam);
}

bool RegisterScreenSaverWindowClass(HINSTANCE instance) {
  WNDCLASSEXW windowClass{};
  windowClass.cbSize = sizeof(windowClass);
  windowClass.style = CS_HREDRAW | CS_VREDRAW;
  windowClass.lpfnWndProc = WindowProcedure;
  windowClass.hInstance = instance;
  windowClass.hCursor = LoadCursorW(nullptr, IDC_ARROW);
  windowClass.hbrBackground = CreateSolidBrush(RGB(6, 6, 18));
  windowClass.lpszClassName = kWindowClass;
  return RegisterClassExW(&windowClass) != 0;
}

BOOL CALLBACK CreateMonitorWindow(HMONITOR monitor, HDC, LPRECT, LPARAM parameter) {
  HINSTANCE instance = reinterpret_cast<HINSTANCE>(parameter);
  MONITORINFO info{};
  info.cbSize = sizeof(info);
  if (!GetMonitorInfoW(monitor, &info)) return TRUE;

  auto screenWindow = std::make_unique<ScreenWindow>();
  screenWindow->shownAt = GetTickCount();
  const RECT bounds = info.rcMonitor;
  HWND hwnd = CreateWindowExW(
      WS_EX_TOPMOST | WS_EX_TOOLWINDOW, kWindowClass, L"Mare Infinitus", WS_POPUP | WS_VISIBLE,
      bounds.left, bounds.top, bounds.right - bounds.left, bounds.bottom - bounds.top,
      nullptr, nullptr, instance, screenWindow.get());
  if (hwnd) {
    SetWindowPos(hwnd, HWND_TOPMOST, bounds.left, bounds.top, bounds.right - bounds.left,
                 bounds.bottom - bounds.top, SWP_SHOWWINDOW | SWP_NOACTIVATE);
    g_windows.push_back(std::move(screenWindow));
  }
  return TRUE;
}

bool CreatePreviewWindow(HINSTANCE instance, HWND parent) {
  RECT bounds{};
  if (!GetClientRect(parent, &bounds)) return false;
  auto screenWindow = std::make_unique<ScreenWindow>();
  screenWindow->preview = true;
  screenWindow->shownAt = GetTickCount();
  HWND hwnd = CreateWindowExW(
      0, kWindowClass, L"Mare Infinitus Preview", WS_CHILD | WS_VISIBLE,
      0, 0, bounds.right - bounds.left, bounds.bottom - bounds.top,
      parent, nullptr, instance, screenWindow.get());
  if (!hwnd) return false;
  g_previewChild = hwnd;
  g_windows.push_back(std::move(screenWindow));
  return true;
}

}  // namespace

int WINAPI wWinMain(HINSTANCE instance, HINSTANCE, PWSTR, int) {
  g_mainThreadId = GetCurrentThreadId();
  const HRESULT comResult = CoInitializeEx(nullptr, COINIT_APARTMENTTHREADED);
  if (FAILED(comResult)) return 1;

  const LaunchOptions options = ParseLaunchOptions();
  if (options.mode == LaunchOptions::Mode::Configure) {
    MessageBoxW(nullptr,
                L"Mare Infinitus uses the simulation's curated defaults and has no screensaver-specific settings.",
                L"Mare Infinitus Screensaver", MB_OK | MB_ICONINFORMATION);
    CoUninitialize();
    return 0;
  }

  if (!RegisterScreenSaverWindowClass(instance)) {
    CoUninitialize();
    return 1;
  }

  if (options.mode == LaunchOptions::Mode::Preview) {
    if (!CreatePreviewWindow(instance, options.previewParent)) {
      CoUninitialize();
      return 1;
    }
    g_previewParent = options.previewParent;
    GetWindowThreadProcessId(g_previewParent, &g_previewParentProcessId);
    std::thread([] {
      while (!g_exitRequested.load() && g_previewParent && IsWindow(g_previewParent) &&
             g_previewChild && IsWindow(g_previewChild) && GetParent(g_previewChild) == g_previewParent) {
        DWORD currentOwnerProcessId = 0;
        GetWindowThreadProcessId(g_previewParent, &currentOwnerProcessId);
        if (currentOwnerProcessId != g_previewParentProcessId) break;
        Sleep(250);
      }
      if (!g_exitRequested.load()) RequestExit();
    }).detach();
  } else {
    EnumDisplayMonitors(nullptr, nullptr, CreateMonitorWindow, reinterpret_cast<LPARAM>(instance));
    if (g_windows.empty()) {
      CoUninitialize();
      return 1;
    }
    ShowCursor(FALSE);
  }

  MSG message{};
  while (GetMessageW(&message, nullptr, 0, 0) > 0) {
    TranslateMessage(&message);
    DispatchMessageW(&message);
  }

  for (const auto& window : g_windows) {
    if (window->hwnd && IsWindow(window->hwnd)) DestroyWindow(window->hwnd);
  }
  g_windows.clear();
  if (options.mode == LaunchOptions::Mode::FullScreen) ShowCursor(TRUE);
  CoUninitialize();
  return 0;
}
