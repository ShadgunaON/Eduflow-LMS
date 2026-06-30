$clientId = "5veprdb5kg4nq3r4cc82qf5u3s"
$email = "admin@eduflow.com"
$password = "Test@12345"

Write-Host "Authenticating as $email..."

$authResponse = aws cognito-idp initiate-auth --client-id $clientId --auth-flow USER_PASSWORD_AUTH --auth-parameters USERNAME=$email,PASSWORD=$password | ConvertFrom-Json

$idToken = $authResponse.AuthenticationResult.IdToken

if (-not $idToken) {
    Write-Host "Failed to get ID Token"
    exit 1
}

Write-Host "Successfully retrieved ID Token."

# Decode JWT Payload
$tokenParts = $idToken.Split(".")
$payloadBase64 = $tokenParts[1]

# Add padding if needed
$paddingLength = $payloadBase64.Length % 4
if ($paddingLength -ne 0) {
    $payloadBase64 = $payloadBase64.PadRight($payloadBase64.Length + (4 - $paddingLength), '=')
}

# Replace URL safe characters
$payloadBase64 = $payloadBase64.Replace('-', '+').Replace('_', '/')

$payloadBytes = [System.Convert]::FromBase64String($payloadBase64)
$payloadString = [System.Text.Encoding]::UTF8.GetString($payloadBytes)

$payloadObj = $payloadString | ConvertFrom-Json

Write-Host "`n--- DECODED ID TOKEN PAYLOAD ---"
$payloadObj | ConvertTo-Json -Depth 5
