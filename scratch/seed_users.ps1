$poolId = "us-east-1_hhb2NN8Nw"

function EnsureUser {
    param($email, $password, $role)
    
    Write-Host "Processing $email..."
    
    # Check if user exists
    $exists = $false
    try {
        $output = aws cognito-idp admin-get-user --user-pool-id $poolId --username $email 2>&1
        if ($LASTEXITCODE -eq 0 -and $output -match "UserStatus") {
            $exists = $true
        }
    } catch {
        # Ignore
    }
    
    if (-not $exists) {
        Write-Host "User $email does not exist. Creating..."
        aws cognito-idp admin-create-user --user-pool-id $poolId --username $email --user-attributes Name=email,Value=$email Name=email_verified,Value=true --message-action SUPPRESS
        aws cognito-idp admin-set-user-password --user-pool-id $poolId --username $email --password $password --permanent
    } else {
        Write-Host "User $email already exists."
    }
    
    Write-Host "Updating role for $email to $role..."
    aws cognito-idp admin-update-user-attributes --user-pool-id $poolId --username $email --user-attributes Name="custom:role",Value=$role
    Write-Host "Done processing $email.`n"
}

EnsureUser "admin@eduflow.com" "Test@12345" "ADMIN"
EnsureUser "yhshadgunasiddhi@gmail.com" "Test@12345" "TUTOR"
EnsureUser "harshavardhahyper@gmail.com" "Test@12345" "STUDENT"
