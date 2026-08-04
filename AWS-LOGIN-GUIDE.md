# How to Log Into the Correct AWS Account

## 🎯 Current Situation

**Problem**: You're logged into the wrong AWS account
- **Current Account**: 529237317113 (ClaudeCodeAccess role)
- **Target Account**: 688672519222 (FIPCO - AWSAdministratorAccess)
- **Config Expects**: AWSAdministratorAccess-688672519222 profile

**Error**: Assessment running as wrong account/role with insufficient permissions

---

## ✅ Solution: Login to Correct Account

### Step 1: Login via AWS SSO

```bash
# Login to your SSO session
aws sso login --profile AWSAdministratorAccess-688672519222
```

This will:
1. Open your browser for SSO authentication
2. Authenticate with your Flexion SSO credentials
3. Grant temporary credentials for account 688672519222

### Step 2: Set as Default Profile

**Option A - Use AWS_PROFILE environment variable (Recommended)**

```bash
# Set for current terminal session
export AWS_PROFILE=AWSAdministratorAccess-688672519222

# Verify it worked
aws sts get-caller-identity
# Should show Account: 688672519222
```

**Option B - Update the tool config to use explicit profile**

The config already specifies the profile:
```yaml
aws:
  profile: "AWSAdministratorAccess-688672519222"
```

### Step 3: Verify Correct Account

```bash
aws sts get-caller-identity --profile AWSAdministratorAccess-688672519222
```

**Expected output**:
```json
{
    "UserId": "AROAXXXXXXXXXX:trowley@flexion.us",
    "Account": "688672519222",    ← Should be this account
    "Arn": "arn:aws:sts::688672519222:assumed-role/AWSAdministratorAccess/trowley@flexion.us"
}
```

### Step 4: Run Assessment with Correct Account

```bash
cd /Users/tim/repos/flexion-msp-readiness

# The tool will use the profile from config.fipco.yaml
npm run dev -- assess --config config.fipco.yaml
```

---

## 🔍 Understanding the Account Mismatch

### Your AWS SSO Setup

You have multiple AWS accounts configured:

```
~/.aws/config:
[profile AWSAdministratorAccess-688672519222]  ← FIPCO account (target)
sso_account_id = 688672519222
sso_role_name = AWSAdministratorAccess
region = us-east-1

[profile AWSAdministratorAccess-370153301343]  ← Different account
sso_account_id = 370153301343
```

### Current Login

```
Current Identity:
Account: 529237317113                           ← Wrong account!
Role: AWSReservedSSO_ClaudeCodeAccess_...
```

### Why This Matters

Different accounts have:
- Different AWS resources (EC2, S3, Config, etc.)
- Different IAM permissions
- Different compliance posture
- Different evidence

Running against the **wrong account** gives you the wrong assessment!

---

## 🚨 Warning About Environment Variables

You currently have these environment variables set:
```bash
AWS_PROFILE=<something>
AWS_ACCESS_KEY_ID=<something>
AWS_SECRET_ACCESS_KEY=<something>
```

This causes the warning:
```
Multiple credential sources detected: 
Both AWS_PROFILE and the pair AWS_ACCESS_KEY_ID/AWS_SECRET_ACCESS_KEY
```

### Fix This

```bash
# Unset the static credentials
unset AWS_ACCESS_KEY_ID
unset AWS_SECRET_ACCESS_KEY

# Keep only AWS_PROFILE
export AWS_PROFILE=AWSAdministratorAccess-688672519222
```

Or add to your `~/.zshrc` or `~/.bashrc`:
```bash
# Use AWS SSO instead of static credentials
unset AWS_ACCESS_KEY_ID
unset AWS_SECRET_ACCESS_KEY
export AWS_PROFILE=AWSAdministratorAccess-688672519222
```

---

## 📋 Complete Login Process

### For New Terminal Session

```bash
# 1. Clear any conflicting credentials
unset AWS_ACCESS_KEY_ID
unset AWS_SECRET_ACCESS_KEY

# 2. Set your profile
export AWS_PROFILE=AWSAdministratorAccess-688672519222

# 3. Login via SSO (if needed)
aws sso login

# 4. Verify you're in the right account
aws sts get-caller-identity
# Should show Account: 688672519222

# 5. Run the assessment
cd /Users/tim/repos/flexion-msp-readiness
npm run dev -- assess --config config.fipco.yaml
```

### Checking SSO Session Status

```bash
# Check if your SSO session is valid
aws sts get-caller-identity --profile AWSAdministratorAccess-688672519222

# If you get an error about expired token:
aws sso login --profile AWSAdministratorAccess-688672519222
```

---

## 🔧 Troubleshooting

### "Token has expired" Error

**Symptom**:
```
Error: The SSO session associated with this profile has expired
```

**Fix**:
```bash
aws sso login --profile AWSAdministratorAccess-688672519222
```

### "Unable to locate credentials"

**Symptom**:
```
Unable to locate credentials. You can configure credentials by running "aws configure"
```

**Fix**:
```bash
# Make sure you're using the correct profile
export AWS_PROFILE=AWSAdministratorAccess-688672519222
aws sso login
```

### Still Getting Wrong Account

**Symptom**: `aws sts get-caller-identity` shows wrong account

**Debug**:
```bash
# Check what credentials are being used
aws configure list --profile AWSAdministratorAccess-688672519222

# Check environment variables
env | grep AWS

# Clear everything and start fresh
unset AWS_PROFILE
unset AWS_ACCESS_KEY_ID
unset AWS_SECRET_ACCESS_KEY
unset AWS_SESSION_TOKEN
unset AWS_DEFAULT_PROFILE

# Then set only what you need
export AWS_PROFILE=AWSAdministratorAccess-688672519222
aws sso login
```

### Wrong Permissions Even in Correct Account

If you're in account 688672519222 but still getting permission errors:

```bash
# Check your actual role
aws sts get-caller-identity

# You should see:
# Arn: arn:aws:sts::688672519222:assumed-role/AWSAdministratorAccess/...

# If you're not using AWSAdministratorAccess role, you may need permissions added
# See AWS-PERMISSIONS-GUIDE.md
```

---

## ✅ Verification Checklist

After logging in, verify everything is correct:

- [ ] **1. Correct Account**
  ```bash
  aws sts get-caller-identity | grep Account
  # Should show: "Account": "688672519222"
  ```

- [ ] **2. Correct Role**
  ```bash
  aws sts get-caller-identity | grep Arn
  # Should show: ...assumed-role/AWSAdministratorAccess/...
  ```

- [ ] **3. No Credential Warnings**
  ```bash
  aws sts get-caller-identity 2>&1 | grep -i warning
  # Should have no output
  ```

- [ ] **4. Can Access AWS Services**
  ```bash
  aws ec2 describe-instances --region us-east-1 --max-results 1
  # Should work without errors
  ```

- [ ] **5. Assessment Works**
  ```bash
  cd /Users/tim/repos/flexion-msp-readiness
  npm run dev -- assess --config config.fipco.yaml 2>&1 | head -20
  # Should load config for account 688672519222
  ```

---

## 🎯 Quick Reference

### Login Commands
```bash
# Full login process
unset AWS_ACCESS_KEY_ID AWS_SECRET_ACCESS_KEY
export AWS_PROFILE=AWSAdministratorAccess-688672519222
aws sso login
aws sts get-caller-identity

# Run assessment
cd ~/repos/flexion-msp-readiness
npm run dev -- assess --config config.fipco.yaml
```

### Check Current Status
```bash
# What account am I in?
aws sts get-caller-identity --query Account --output text

# What profile am I using?
echo $AWS_PROFILE

# Is my SSO session valid?
aws sts get-caller-identity >/dev/null 2>&1 && echo "Valid" || echo "Expired - run: aws sso login"
```

---

## 💡 Best Practices

### 1. Use AWS_PROFILE Instead of Default Credentials

**Don't**:
```bash
export AWS_ACCESS_KEY_ID=AKIA...
export AWS_SECRET_ACCESS_KEY=...
```

**Do**:
```bash
export AWS_PROFILE=AWSAdministratorAccess-688672519222
aws sso login
```

### 2. Add to Shell Profile

Add to `~/.zshrc`:
```bash
# AWS SSO Configuration
export AWS_PROFILE=AWSAdministratorAccess-688672519222

# Function to quickly re-login
aws-login() {
  aws sso login --profile AWSAdministratorAccess-688672519222
}

# Function to check current account
aws-whoami() {
  aws sts get-caller-identity
}
```

Then:
```bash
source ~/.zshrc
aws-login
aws-whoami
```

### 3. Use Different Profiles for Different Accounts

```bash
# FIPCO production
export AWS_PROFILE=AWSAdministratorAccess-688672519222

# Other account
export AWS_PROFILE=AWSAdministratorAccess-370153301343

# Override for specific commands
aws s3 ls --profile AWSAdministratorAccess-688672519222
```

---

## 🔗 Related Documentation

- **AWS SSO Login**: https://docs.aws.amazon.com/cli/latest/userguide/sso-configure-profile-token.html
- **AWS Profiles**: https://docs.aws.amazon.com/cli/latest/userguide/cli-configure-profiles.html
- **Permissions Guide**: See AWS-PERMISSIONS-GUIDE.md
- **FIPCO Config**: config.fipco.yaml

---

**Generated**: August 4, 2026  
**Your Current Account**: 529237317113  
**Target FIPCO Account**: 688672519222  
**Profile to Use**: AWSAdministratorAccess-688672519222
