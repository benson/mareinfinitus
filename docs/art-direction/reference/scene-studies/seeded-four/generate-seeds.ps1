$alphabet = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789'
1..4 | ForEach-Object {
    $seed = -join (1..256 | ForEach-Object {
        $alphabet[[System.Security.Cryptography.RandomNumberGenerator]::GetInt32($alphabet.Length)]
    })
    [pscustomobject]@{variant = $_; seed = $seed}
} | ConvertTo-Json
