#import "MareInfinitusView.h"

#import <WebKit/WebKit.h>

@interface MareInfinitusView () <WKNavigationDelegate>
@property(nonatomic, strong) WKWebView *mareWebView;
@property(nonatomic, strong) NSURL *webRootURL;
@end

@implementation MareInfinitusView

- (instancetype)initWithFrame:(NSRect)frame isPreview:(BOOL)isPreview {
  self = [super initWithFrame:frame isPreview:isPreview];
  if (self) {
    self.animationTimeInterval = 1.0;
    self.wantsLayer = YES;
    self.layer.backgroundColor = NSColor.blackColor.CGColor;
    [self installWebView];
  }
  return self;
}

- (void)installWebView {
  NSBundle *bundle = [NSBundle bundleForClass:self.class];
  NSURL *webRoot = [bundle.resourceURL URLByAppendingPathComponent:@"Web" isDirectory:YES];
  NSURL *indexURL = [webRoot URLByAppendingPathComponent:@"index.html" isDirectory:NO];
  NSURLComponents *screenSaverComponents =
      [NSURLComponents componentsWithURL:indexURL resolvingAgainstBaseURL:NO];
  screenSaverComponents.queryItems =
      @[[NSURLQueryItem queryItemWithName:@"screensaver" value:@"1"]];
  NSURL *screenSaverURL = screenSaverComponents.URL ?: indexURL;
  self.webRootURL = webRoot;

  WKWebViewConfiguration *configuration = [[WKWebViewConfiguration alloc] init];
  configuration.websiteDataStore = WKWebsiteDataStore.nonPersistentDataStore;
  configuration.preferences.javaScriptCanOpenWindowsAutomatically = NO;

  NSString *screenSaverBootstrap =
      @"(function(){"
       "function enterScreenSaverMode(){"
         "document.documentElement.classList.add('mare-native-screensaver');"
         "if(document.getElementById('mare-native-screensaver-style'))return;"
         "var style=document.createElement('style');"
         "style.id='mare-native-screensaver-style';"
         "style.textContent='html,body{cursor:none!important;overflow:hidden!important;background:#070713!important}' +"
           "'.ui-chrome,.glossary-panel,.inspection-tooltip,.inspect-key-hint,.welcome-backdrop{display:none!important}';"
         "(document.head||document.documentElement).appendChild(style);"
       "}"
       "enterScreenSaverMode();"
       "document.addEventListener('DOMContentLoaded',enterScreenSaverMode,{once:true});"
       "document.addEventListener('contextmenu',function(event){event.preventDefault();});"
      "})();";
  WKUserScript *bootstrap = [[WKUserScript alloc]
      initWithSource:screenSaverBootstrap
      injectionTime:WKUserScriptInjectionTimeAtDocumentStart
      forMainFrameOnly:YES];
  [configuration.userContentController addUserScript:bootstrap];

  WKWebView *webView = [[WKWebView alloc] initWithFrame:self.bounds configuration:configuration];
  webView.autoresizingMask = NSViewWidthSizable | NSViewHeightSizable;
  webView.navigationDelegate = self;
  webView.allowsBackForwardNavigationGestures = NO;
  webView.underPageBackgroundColor = NSColor.blackColor;
  webView.wantsLayer = YES;
  webView.layer.backgroundColor = NSColor.blackColor.CGColor;
  webView.enclosingScrollView.drawsBackground = YES;
  webView.enclosingScrollView.backgroundColor = NSColor.blackColor;
  webView.enclosingScrollView.hasHorizontalScroller = NO;
  webView.enclosingScrollView.hasVerticalScroller = NO;
  self.mareWebView = webView;
  [self addSubview:webView];

  if ([[NSFileManager defaultManager] fileExistsAtPath:indexURL.path]) {
    [webView loadFileURL:screenSaverURL allowingReadAccessToURL:webRoot];
  } else {
    [self showLoadError:@"The bundled Mare Infinitus scene could not be found."];
  }
}

- (void)showLoadError:(NSString *)message {
  NSTextField *label = [NSTextField labelWithString:message];
  label.textColor = NSColor.whiteColor;
  label.alignment = NSTextAlignmentCenter;
  label.font = [NSFont monospacedSystemFontOfSize:14 weight:NSFontWeightRegular];
  label.frame = NSInsetRect(self.bounds, 40, 40);
  label.autoresizingMask = NSViewWidthSizable | NSViewHeightSizable;
  [self addSubview:label];
}

- (void)startAnimation {
  [super startAnimation];
  if (self.mareWebView == nil) {
    [self installWebView];
  }
}

- (void)stopAnimation {
  self.mareWebView.navigationDelegate = nil;
  [self.mareWebView stopLoading];
  [self.mareWebView removeFromSuperview];
  self.mareWebView = nil;
  [super stopAnimation];
}

- (void)animateOneFrame {
  // WKWebView owns the requestAnimationFrame loop. The ScreenSaverView timer is
  // deliberately idle so it does not compete with the browser compositor.
}

- (void)drawRect:(NSRect)rect {
  (void)rect;
  [NSColor.blackColor setFill];
  NSRectFill(rect);
}

- (void)webView:(WKWebView *)webView
    decidePolicyForNavigationAction:(WKNavigationAction *)navigationAction
                    decisionHandler:(void (^)(WKNavigationActionPolicy))decisionHandler {
  (void)webView;
  NSURL *URL = navigationAction.request.URL;
  NSString *rootPath = self.webRootURL.URLByStandardizingPath.path ?: @"";
  NSString *requestedPath = URL.URLByStandardizingPath.path ?: @"";
  NSString *rootDirectoryPrefix = [rootPath stringByAppendingString:@"/"];
  BOOL isInsideWebRoot = [requestedPath isEqualToString:rootPath] ||
                         [requestedPath hasPrefix:rootDirectoryPrefix];
  BOOL isBundledFile = URL.isFileURL && rootPath.length > 0 && isInsideWebRoot;
  decisionHandler(isBundledFile ? WKNavigationActionPolicyAllow : WKNavigationActionPolicyCancel);
}

- (void)webView:(WKWebView *)webView
    didFailNavigation:(WKNavigation *)navigation
             withError:(NSError *)error {
  (void)webView;
  (void)navigation;
  (void)error;
  [self showLoadError:@"Mare Infinitus could not start."];
}

- (void)webView:(WKWebView *)webView
    didFailProvisionalNavigation:(WKNavigation *)navigation
                        withError:(NSError *)error {
  (void)webView;
  (void)navigation;
  (void)error;
  [self showLoadError:@"Mare Infinitus could not start."];
}

- (void)dealloc {
  self.mareWebView.navigationDelegate = nil;
}

@end
