import sqlite3
import os
from datetime import datetime
from pathlib import Path
from typing import Dict, List, Optional
import json


class ViewTracker:
    def __init__(self, db_path: str = "view_stats.db"):
        self.db_path = db_path
        self.init_database()

    def init_database(self):
        """Initialize the database with required tables"""
        with sqlite3.connect(self.db_path) as conn:
            cursor = conn.cursor()

            # Create guide_views table
            cursor.execute('''
                CREATE TABLE IF NOT EXISTS guide_views (
                    id INTEGER PRIMARY KEY AUTOINCREMENT,
                    guide_slug TEXT NOT NULL,
                    client_id TEXT NOT NULL,
                    ip_address TEXT,
                    user_agent TEXT,
                    viewed_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                    UNIQUE(guide_slug, client_id)
                )
            ''')

            # Create indexes for performance
            cursor.execute('''
                CREATE INDEX IF NOT EXISTS idx_guide_views_slug 
                ON guide_views(guide_slug)
            ''')

            cursor.execute('''
                CREATE INDEX IF NOT EXISTS idx_guide_views_date 
                ON guide_views(viewed_at)
            ''')

            cursor.execute('''
                CREATE INDEX IF NOT EXISTS idx_guide_views_ip 
                ON guide_views(ip_address)
            ''')

            conn.commit()

    def track_view(self, guide_slug: str, client_id: str, ip_address: str, user_agent: str, excluded_ips: List[str] = None) -> bool:
        """
        Track a view for a guide
        Returns True if view was tracked, False if IP was excluded
        """
        if excluded_ips and ip_address in excluded_ips:
            print(f"📊 Skipping view tracking for excluded IP: {ip_address}")
            return False

        try:
            with sqlite3.connect(self.db_path) as conn:
                cursor = conn.cursor()

                # Use INSERT OR IGNORE to handle unique constraint
                cursor.execute('''
                    INSERT OR IGNORE INTO guide_views 
                    (guide_slug, client_id, ip_address, user_agent, viewed_at)
                    VALUES (?, ?, ?, ?, ?)
                ''', (guide_slug, client_id, ip_address, user_agent, datetime.now()))

                # Check if a new row was inserted
                if cursor.rowcount > 0:
                    print(
                        f"📊 Tracked new view for guide: {guide_slug} from IP: {ip_address}")
                else:
                    print(
                        f"📊 Skipped duplicate view for guide: {guide_slug} from IP: {ip_address}")

                conn.commit()
                return True

        except Exception as e:
            print(f"❌ Error tracking view: {e}")
            return False

    def get_guide_stats(self, guide_slug: str) -> Dict[str, int]:
        """Get view statistics for a guide"""
        try:
            with sqlite3.connect(self.db_path) as conn:
                cursor = conn.cursor()

                # Get total views
                cursor.execute('''
                    SELECT COUNT(*) FROM guide_views 
                    WHERE guide_slug = ?
                ''', (guide_slug,))
                total_views = cursor.fetchone()[0]

                # Get unique viewers
                cursor.execute('''
                    SELECT COUNT(DISTINCT client_id) FROM guide_views 
                    WHERE guide_slug = ?
                ''', (guide_slug,))
                unique_viewers = cursor.fetchone()[0]

                return {
                    "total_views": total_views,
                    "unique_viewers": unique_viewers
                }

        except Exception as e:
            print(f"❌ Error getting guide stats: {e}")
            return {"total_views": 0, "unique_viewers": 0}

    def get_overall_stats(self) -> Dict[str, int]:
        """Get overall statistics across all guides"""
        try:
            with sqlite3.connect(self.db_path) as conn:
                cursor = conn.cursor()

                # Total views across all guides
                cursor.execute('SELECT COUNT(*) FROM guide_views')
                total_views = cursor.fetchone()[0]

                # Total unique viewers across all guides
                cursor.execute(
                    'SELECT COUNT(DISTINCT client_id) FROM guide_views')
                total_unique_viewers = cursor.fetchone()[0]

                # Total guides with views
                cursor.execute(
                    'SELECT COUNT(DISTINCT guide_slug) FROM guide_views')
                total_guides = cursor.fetchone()[0]

                return {
                    "total_views": total_views,
                    "total_unique_viewers": total_unique_viewers,
                    "total_guides": total_guides
                }

        except Exception as e:
            print(f"❌ Error getting overall stats: {e}")
            return {"total_views": 0, "total_unique_viewers": 0, "total_guides": 0}

    def get_top_guides(self, limit: int = 3) -> List[Dict[str, any]]:
        """Get top guides by unique viewers"""
        try:
            with sqlite3.connect(self.db_path) as conn:
                cursor = conn.cursor()

                cursor.execute('''
                    SELECT 
                        guide_slug,
                        COUNT(*) as total_views,
                        COUNT(DISTINCT client_id) as unique_viewers
                    FROM guide_views 
                    GROUP BY guide_slug 
                    ORDER BY unique_viewers DESC, total_views DESC
                    LIMIT ?
                ''', (limit,))

                results = []
                for row in cursor.fetchall():
                    results.append({
                        "slug": row[0],
                        "total_views": row[1],
                        "unique_viewers": row[2]
                    })

                return results

        except Exception as e:
            print(f"❌ Error getting top guides: {e}")
            return []

    def migrate_from_json(self, json_file_path: str):
        """Migrate existing data from JSON file"""
        if not os.path.exists(json_file_path):
            print(f"📁 No existing JSON file found at {json_file_path}")
            return

        try:
            with open(json_file_path, 'r') as f:
                data = json.load(f)

            migrated_count = 0
            for guide_slug, stats in data.items():
                # For each unique viewer, create a view record
                for client_id in stats.get("unique_viewers", []):
                    try:
                        with sqlite3.connect(self.db_path) as conn:
                            cursor = conn.cursor()
                            cursor.execute('''
                                INSERT OR IGNORE INTO guide_views 
                                (guide_slug, client_id, ip_address, user_agent, viewed_at)
                                VALUES (?, ?, ?, ?, ?)
                            ''', (guide_slug, client_id, "migrated", "migrated", datetime.now()))

                            if cursor.rowcount > 0:
                                migrated_count += 1

                            conn.commit()
                    except Exception as e:
                        print(f"❌ Error migrating data for {guide_slug}: {e}")

            print(f"✅ Migrated {migrated_count} view records from JSON")

        except Exception as e:
            print(f"❌ Error migrating from JSON: {e}")

    def get_guide_list(self) -> List[str]:
        """Get list of all guides that have been viewed"""
        try:
            with sqlite3.connect(self.db_path) as conn:
                cursor = conn.cursor()
                cursor.execute(
                    'SELECT DISTINCT guide_slug FROM guide_views ORDER BY guide_slug')
                return [row[0] for row in cursor.fetchall()]
        except Exception as e:
            print(f"❌ Error getting guide list: {e}")
            return []
