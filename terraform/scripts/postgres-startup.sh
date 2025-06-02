#!/bin/bash

# PostgreSQL setup script for Ubuntu 22.04
set -e

# Variables from Terraform
DB_NAME="${DB_NAME}"
DB_USER="${DB_USER}"
DB_PASSWORD="${DB_PASSWORD}"

# Log function
log() {
    echo "[$(date '+%Y-%m-%d %H:%M:%S')] $1" | tee -a /var/log/postgres-setup.log
}

log "Starting PostgreSQL setup..."

# Update system
log "Updating system packages..."
apt-get update
apt-get upgrade -y

# Install PostgreSQL
log "Installing PostgreSQL..."
apt-get install -y postgresql postgresql-contrib

# Start and enable PostgreSQL
log "Starting PostgreSQL service..."
systemctl start postgresql
systemctl enable postgresql

# Configure PostgreSQL
log "Configuring PostgreSQL..."

# Set password for postgres user
sudo -u postgres psql -c "ALTER USER postgres PASSWORD '$DB_PASSWORD';"

# Create application database
sudo -u postgres createdb "$DB_NAME"

# Create application user if different from postgres
if [ "$DB_USER" != "postgres" ]; then
    sudo -u postgres psql -c "CREATE USER $DB_USER WITH PASSWORD '$DB_PASSWORD';"
    sudo -u postgres psql -c "GRANT ALL PRIVILEGES ON DATABASE $DB_NAME TO $DB_USER;"
fi

# Configure PostgreSQL for remote connections
log "Configuring PostgreSQL for remote connections..."

# Use fixed PostgreSQL 12 path instead of dynamic detection
PG_CONFIG_DIR="/etc/postgresql/12/main"

# Backup original configs
cp "$PG_CONFIG_DIR/postgresql.conf" "$PG_CONFIG_DIR/postgresql.conf.backup"
cp "$PG_CONFIG_DIR/pg_hba.conf" "$PG_CONFIG_DIR/pg_hba.conf.backup"

# Configure postgresql.conf
cat >> "$PG_CONFIG_DIR/postgresql.conf" << EOF

# Added by startup script
listen_addresses = '*'
port = 5432
max_connections = 100
shared_buffers = 32MB
effective_cache_size = 128MB
maintenance_work_mem = 16MB
checkpoint_completion_target = 0.9
wal_buffers = 1MB
default_statistics_target = 100
random_page_cost = 4
effective_io_concurrency = 2

# Logging
log_destination = 'stderr'
logging_collector = on
log_directory = '/var/log/postgresql'
log_filename = 'postgresql-%Y-%m-%d_%H%M%S.log'
log_rotation_age = 1d
log_min_duration_statement = 1000
log_line_prefix = '%t [%p-%l] %q%u@%d '

# Memory settings for e2-micro (1GB RAM)
work_mem = 4MB
maintenance_work_mem = 64MB
shared_buffers = 128MB
effective_cache_size = 512MB
EOF

# Configure pg_hba.conf for subnet access
cat >> "$PG_CONFIG_DIR/pg_hba.conf" << EOF

# Added by startup script - Allow subnet connections
host    all             all             10.0.1.0/24            md5
# Added by startup script - Allow GKE pod connections
host    all             all             10.240.0.0/14          md5
EOF

# Restart PostgreSQL to apply changes
log "Restarting PostgreSQL..."
systemctl restart postgresql

# Configure firewall
log "Configuring firewall..."
ufw allow from 10.0.1.0/24 to any port 5432

# Create tables for the application
log "Creating application tables..."
sudo -u postgres psql -d "$DB_NAME" << 'EOF'
-- Users table
CREATE TABLE IF NOT EXISTS users (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    username VARCHAR(50) UNIQUE NOT NULL,
    email VARCHAR(100) UNIQUE NOT NULL,
    password VARCHAR(128) NOT NULL,
    first_name VARCHAR(50),
    last_name VARCHAR(50),
    is_active BOOLEAN DEFAULT true,
    last_login TIMESTAMP,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Todos table
CREATE TABLE IF NOT EXISTS todos (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    title VARCHAR(200) NOT NULL,
    description TEXT,
    completed BOOLEAN DEFAULT false,
    priority VARCHAR(10) DEFAULT 'medium' CHECK (priority IN ('low', 'medium', 'high')),
    due_date TIMESTAMP,
    user_id UUID NOT NULL,
    category VARCHAR(50) DEFAULT 'general',
    tags TEXT[],
    completed_at TIMESTAMP,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);

-- Indexes for performance
CREATE INDEX IF NOT EXISTS idx_todos_user_id ON todos(user_id);
CREATE INDEX IF NOT EXISTS idx_todos_completed ON todos(completed);
CREATE INDEX IF NOT EXISTS idx_todos_priority ON todos(priority);
CREATE INDEX IF NOT EXISTS idx_todos_due_date ON todos(due_date);
CREATE INDEX IF NOT EXISTS idx_todos_category ON todos(category);
CREATE INDEX IF NOT EXISTS idx_todos_created_at ON todos(created_at);
CREATE INDEX IF NOT EXISTS idx_users_email ON users(email);
CREATE INDEX IF NOT EXISTS idx_users_username ON users(username);

-- Update trigger for todos
CREATE OR REPLACE FUNCTION update_todos_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = CURRENT_TIMESTAMP;
    IF NEW.completed = true AND OLD.completed = false THEN
        NEW.completed_at = CURRENT_TIMESTAMP;
    ELSIF NEW.completed = false AND OLD.completed = true THEN
        NEW.completed_at = NULL;
    END IF;
    RETURN NEW;
END;
$$ language 'plpgsql';

DROP TRIGGER IF EXISTS update_todos_updated_at_trigger ON todos;
CREATE TRIGGER update_todos_updated_at_trigger
    BEFORE UPDATE ON todos
    FOR EACH ROW
    EXECUTE FUNCTION update_todos_updated_at();

-- Update trigger for users
CREATE OR REPLACE FUNCTION update_users_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = CURRENT_TIMESTAMP;
    RETURN NEW;
END;
$$ language 'plpgsql';

DROP TRIGGER IF EXISTS update_users_updated_at_trigger ON users;
CREATE TRIGGER update_users_updated_at_trigger
    BEFORE UPDATE ON users
    FOR EACH ROW
    EXECUTE FUNCTION update_users_updated_at();
EOF

# Setup monitoring
log "Setting up monitoring..."
apt-get install -y postgresql-contrib

# Create monitoring script
cat > /usr/local/bin/postgres-monitor.sh << 'EOF'
#!/bin/bash
# Simple PostgreSQL monitoring script

LOGFILE="/var/log/postgres-monitor.log"
DATE=$(date '+%Y-%m-%d %H:%M:%S')

# Check if PostgreSQL is running
if systemctl is-active --quiet postgresql; then
    STATUS="UP"
else
    STATUS="DOWN"
fi

# Get connection count
CONNECTIONS=$(sudo -u postgres psql -t -c "SELECT count(*) FROM pg_stat_activity;" 2>/dev/null || echo "0")

# Log status
echo "[$DATE] PostgreSQL Status: $STATUS, Connections: $CONNECTIONS" >> $LOGFILE

# Rotate log if it gets too large (>10MB)
if [ -f "$LOGFILE" ] && [ $(stat --format=%s "$LOGFILE") -gt 10485760 ]; then
    mv "$LOGFILE" "$LOGFILE.old"
fi
EOF

chmod +x /usr/local/bin/postgres-monitor.sh

# Add monitoring to crontab
(crontab -l 2>/dev/null; echo "*/5 * * * * /usr/local/bin/postgres-monitor.sh") | crontab -

log "PostgreSQL setup completed successfully!"
log "Database: $DB_NAME"
log "User: $DB_USER"
log "Status: $(systemctl is-active postgresql)"

# Final verification
sudo -u postgres psql -d "$DB_NAME" -c "\dt" 2>/dev/null && log "Tables created successfully" || log "Warning: Could not verify tables"

log "Setup script finished." 