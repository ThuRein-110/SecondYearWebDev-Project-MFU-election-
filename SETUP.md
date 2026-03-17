# MFU Election System - Setup Instructions

## Prerequisites
- Node.js installed
- MySQL/MariaDB running locally

## Quick Setup

### 1. Install Dependencies
```bash
cd /Users/thureinoo/Documents/WEB/mfu-election/backend
npm install
```

### 2. Start MySQL Server
Make sure MySQL is running on your system. If using macOS:
```bash
brew services start mysql
# or
mysql.server start
```

### 3. Run Database Setup
```bash
cd /Users/thureinoo/Documents/WEB/mfu-election/backend
node setup.js
```

This will:
- Create the `mfu_election` database
- Create all required tables
- Insert default admin and voter accounts

### 4. Start the Server
```bash
cd /Users/thureinoo/Documents/WEB/mfu-election/backend
node --watch app.js
```

Server runs on: `http://localhost:3000`

## Test Credentials

### Voter Login
- Citizen ID: `1234567890123`
- Laser ID: `AB1234`

### Admin Login
- Username: `admin`
- Password: `admin123`

## Troubleshooting

### Error: "Database error"
**Solution:** Run the setup script first:
```bash
node setup.js
```

### Error: "Cannot find module mysql2"
**Solution:** Install dependencies:
```bash
npm install
```

### MySQL Connection Failed
**Solution:** 
1. Check if MySQL is running:
   ```bash
   mysql.server status
   ```
2. Start MySQL if not running:
   ```bash
   mysql.server start
   ```

### Port 3000 Already in Use
**Solution:** Kill the process using port 3000:
```bash
lsof -i :3000
kill -9 <PID>
```

## Database Structure

The system creates these tables:
- `voters` - User accounts for voting
- `candidates` - Election candidates with party, position, policy
- `votes` - Cast votes linking voters to candidates
- `admins` - Administrator accounts
- `settings` - System settings (voting_enabled flag)

## Features

✅ Voter Login & Dashboard
✅ Candidate List with Images
✅ Vote Casting
✅ Voting Results & Current Standing
✅ Admin Dashboard
✅ Voting History
✅ Secure Sessions

Enjoy the MFU Election System! 🎉
