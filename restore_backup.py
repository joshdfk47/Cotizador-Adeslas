import os
import shutil
import datetime

# Configuration
FILES_TO_BACKUP = [
    "TOJUCHATIS/index.html",
    "buscador patologias/buscador_patologias_base_interna_v2.html",
    "data.js"
]
BACKUP_DIR = "backups"

def create_restore_point(description="No description"):
    timestamp = datetime.datetime.now().strftime("%Y%m%d_%H%M%S")
    version_dir = os.path.join(BACKUP_DIR, f"restore_point_{timestamp}")
    
    if not os.path.exists(version_dir):
        os.makedirs(version_dir, exist_ok=True)
    
    # Copy files
    for file_path in FILES_TO_BACKUP:
        if os.path.exists(file_path):
            # Create subdirs if needed
            dest_path = os.path.join(version_dir, file_path)
            os.makedirs(os.path.dirname(dest_path), exist_ok=True)
            shutil.copy2(file_path, dest_path)
            print(f"Backed up: {file_path}")
        else:
            print(f"Warning: File {file_path} not found.")

    # Write metadata
    with open(os.path.join(version_dir, "metadata.txt"), "w") as f:
        f.write(f"Timestamp: {timestamp}\n")
        f.write(f"Description: {description}\n")

    # Update VERSION_LOG.txt - keeping it simple for the user log
    with open("VERSION_LOG.md", "a") as log:
        log.write(f"\n*   `backups/restore_point_{timestamp}` ({description})\n")

    print(f"\nRestore point 'restore_point_{timestamp}' created successfully at {version_dir}")

def list_restore_points():
    if not os.path.exists("restore_log.txt"):
        print("No restore points found.")
        return
    with open("restore_log.txt", "r") as f:
        print(f.read())

if __name__ == "__main__":
    import sys
    desc = " ".join(sys.argv[1:]) if len(sys.argv) > 1 else "Auto backup before update"
    create_restore_point(desc)
