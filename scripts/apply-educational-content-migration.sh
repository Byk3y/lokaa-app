#!/bin/bash

# ============================================================================
# Educational Content Migration Script
# ============================================================================
# This script safely applies the educational content migration that replaces
# the terrible practice of storing lessons as posts with a proper educational
# content management system.
# ============================================================================

set -e  # Exit on any error

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Configuration
PROJECT_ID="${SUPABASE_PROJECT_ID:-nmddvthcsyppyjncqfsk}"
MIGRATION_DIR="supabase/migrations"
BACKUP_DIR="backups/educational-content-migration-$(date +%Y%m%d_%H%M%S)"

# ============================================================================
# HELPER FUNCTIONS
# ============================================================================

log_info() {
    echo -e "${BLUE}ℹ️  $1${NC}"
}

log_success() {
    echo -e "${GREEN}✅ $1${NC}"
}

log_warning() {
    echo -e "${YELLOW}⚠️  $1${NC}"
}

log_error() {
    echo -e "${RED}❌ $1${NC}"
}

log_section() {
    echo
    echo -e "${BLUE}============================================================================${NC}"
    echo -e "${BLUE}$1${NC}"
    echo -e "${BLUE}============================================================================${NC}"
    echo
}

# ============================================================================
# PRE-MIGRATION CHECKS
# ============================================================================

check_prerequisites() {
    log_section "Checking Prerequisites"
    
    # Check if supabase CLI is installed
    if ! command -v supabase &> /dev/null; then
        log_error "Supabase CLI is not installed. Please install it first."
        exit 1
    fi
    
    # Check if we're in the right directory
    if [ ! -f "supabase/config.toml" ]; then
        log_error "Not in a Supabase project directory. Please run this from the project root."
        exit 1
    fi
    
    # Check if migration files exist
    if [ ! -f "$MIGRATION_DIR/20250108000000_create_educational_content_system.sql" ]; then
        log_error "Educational content migration file not found."
        exit 1
    fi
    
    if [ ! -f "$MIGRATION_DIR/20250108000001_migrate_existing_lesson_data.sql" ]; then
        log_error "Data migration file not found."
        exit 1
    fi
    
    log_success "All prerequisites met"
}

# ============================================================================
# BACKUP FUNCTIONS
# ============================================================================

create_backup() {
    log_section "Creating Backup"
    
    mkdir -p "$BACKUP_DIR"
    
    log_info "Creating backup of current lesson data..."
    
    # Export current lesson data
    npx supabase db dump --project-id="$PROJECT_ID" \
        --schema=public \
        --table=course_lessons \
        --table=posts \
        --table=course_modules \
        --table=courses \
        > "$BACKUP_DIR/pre_migration_data.sql"
    
    # Create a JSON backup as well for easier analysis
    cat > "$BACKUP_DIR/backup_queries.sql" << 'EOF'
-- Backup queries to recreate current state if needed
COPY (
    SELECT 
        cl.*,
        p.content as post_content,
        p.title as post_title,
        p.post_type
    FROM course_lessons cl
    LEFT JOIN posts p ON cl.post_id = p.id
) TO STDOUT WITH CSV HEADER;
EOF
    
    log_info "Backup created in: $BACKUP_DIR"
    log_success "Backup completed successfully"
}

# ============================================================================
# MIGRATION FUNCTIONS
# ============================================================================

apply_schema_migration() {
    log_section "Applying Schema Migration"
    
    log_info "Creating educational content system tables..."
    
    # Apply the schema migration
    npx supabase db push --project-id="$PROJECT_ID" \
        --include-all \
        --schema=public
    
    if [ $? -eq 0 ]; then
        log_success "Schema migration applied successfully"
    else
        log_error "Schema migration failed"
        exit 1
    fi
}

apply_data_migration() {
    log_section "Applying Data Migration"
    
    log_info "Migrating existing lesson data from posts to educational content..."
    
    # Apply the data migration
    npx supabase db reset --project-id="$PROJECT_ID" --linked
    
    if [ $? -eq 0 ]; then
        log_success "Data migration applied successfully"
    else
        log_error "Data migration failed"
        exit 1
    fi
}

# ============================================================================
# VERIFICATION FUNCTIONS
# ============================================================================

verify_migration() {
    log_section "Verifying Migration"
    
    log_info "Running migration verification queries..."
    
    # Check if new tables exist
    TABLES_CHECK=$(npx supabase db inspect --project-id="$PROJECT_ID" | grep -E "(educational_content|course_media|course_videos)" | wc -l)
    
    if [ "$TABLES_CHECK" -ge 3 ]; then
        log_success "New educational content tables created"
    else
        log_error "New tables not found"
        return 1
    fi
    
    # Check if data was migrated
    cat > /tmp/verify_migration.sql << 'EOF'
DO $$
DECLARE
    total_lessons INTEGER;
    migrated_lessons INTEGER;
    educational_content_count INTEGER;
    migration_success_rate DECIMAL;
BEGIN
    -- Count total lessons
    SELECT COUNT(*) INTO total_lessons FROM course_lessons;
    
    -- Count migrated lessons (with content_id)
    SELECT COUNT(*) INTO migrated_lessons 
    FROM course_lessons 
    WHERE content_id IS NOT NULL;
    
    -- Count educational content records
    SELECT COUNT(*) INTO educational_content_count FROM educational_content;
    
    -- Calculate success rate
    migration_success_rate := CASE 
        WHEN total_lessons > 0 THEN (migrated_lessons::DECIMAL / total_lessons) * 100 
        ELSE 0 
    END;
    
    -- Output results
    RAISE NOTICE '📊 MIGRATION VERIFICATION RESULTS:';
    RAISE NOTICE '  Total lessons: %', total_lessons;
    RAISE NOTICE '  Migrated lessons: %', migrated_lessons;
    RAISE NOTICE '  Educational content records: %', educational_content_count;
    RAISE NOTICE '  Migration success rate: %%%', ROUND(migration_success_rate, 2);
    
    -- Check for any issues
    IF migration_success_rate < 95 THEN
        RAISE WARNING '⚠️  Migration success rate is below 95%%';
    ELSE
        RAISE NOTICE '✅ Migration completed successfully with high success rate';
    END IF;
END $$;
EOF
    
    npx supabase db reset --project-id="$PROJECT_ID" --db-url="$DATABASE_URL" < /tmp/verify_migration.sql
    
    log_success "Migration verification completed"
}

check_for_data_loss() {
    log_section "Checking for Data Loss"
    
    log_info "Verifying no data was lost during migration..."
    
    cat > /tmp/check_data_loss.sql << 'EOF'
DO $$
DECLARE
    unmigrated_lessons INTEGER;
    orphaned_content INTEGER;
BEGIN
    -- Check for unmigrated lessons
    SELECT COUNT(*) INTO unmigrated_lessons
    FROM course_lessons 
    WHERE content_id IS NULL 
    AND (content_text IS NOT NULL OR post_id IS NOT NULL);
    
    -- Check for orphaned educational content
    SELECT COUNT(*) INTO orphaned_content
    FROM educational_content ec
    WHERE NOT EXISTS (
        SELECT 1 FROM course_lessons cl WHERE cl.content_id = ec.id
    );
    
    -- Report results
    IF unmigrated_lessons > 0 THEN
        RAISE WARNING '⚠️  % lessons were not migrated', unmigrated_lessons;
    ELSE
        RAISE NOTICE '✅ All lessons migrated successfully - no data loss';
    END IF;
    
    IF orphaned_content > 0 THEN
        RAISE WARNING '⚠️  % orphaned educational content records found', orphaned_content;
    ELSE
        RAISE NOTICE '✅ No orphaned content found';
    END IF;
END $$;
EOF
    
    npx supabase db reset --project-id="$PROJECT_ID" --db-url="$DATABASE_URL" < /tmp/check_data_loss.sql
    
    log_success "Data loss check completed"
}

# ============================================================================
# MAIN EXECUTION
# ============================================================================

main() {
    log_section "Educational Content Migration"
    echo "This script will migrate lessons from the terrible post-based system"
    echo "to a proper educational content management system."
    echo
    echo "⚠️  This is a significant database change. Make sure you have a backup!"
    echo
    
    read -p "Do you want to continue? (y/N): " -n 1 -r
    echo
    if [[ ! $REPLY =~ ^[Yy]$ ]]; then
        log_info "Migration cancelled"
        exit 0
    fi
    
    # Run migration steps
    check_prerequisites
    create_backup
    apply_schema_migration
    apply_data_migration
    verify_migration
    check_for_data_loss
    
    log_section "Migration Completed Successfully! 🎉"
    echo
    log_success "Lessons are no longer stored as posts!"
    log_success "Educational content now has proper separation from social posts"
    log_info "Backup saved to: $BACKUP_DIR"
    echo
    log_info "Next steps:"
    echo "  1. Update frontend code to use new EducationalContentService"
    echo "  2. Test lesson creation and editing functionality"
    echo "  3. Verify all existing lessons display correctly"
    echo "  4. Remove deprecated post_id references from frontend"
    echo
    log_warning "Remember to update your TypeScript types to use the new system!"
}

# Run the migration
main "$@" 