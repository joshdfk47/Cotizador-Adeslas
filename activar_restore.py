import os
import shutil

BACKUP_DIR = "backups"
FILES_TO_BACKUP = [
    "TOJUCHATIS/index.html",
    "buscador patologias/buscador_patologias_base_interna_v2.html",
    "data.js"
]

def list_backups():
    if not os.path.exists(BACKUP_DIR):
        print(f"No existe el directorio de backups: {BACKUP_DIR}")
        return []
    
    backups = sorted([d for d in os.listdir(BACKUP_DIR) if d.startswith("v_")])
    if not backups:
        print("No se encontraron puntos de restauración.")
        return []
    
    print("\n--- PUNTOS DE RESTAURACIÓN DISPONIBLES ---")
    for i, b in enumerate(backups):
        meta_path = os.path.join(BACKUP_DIR, b, "metadata.txt")
        desc = "Sin descripción"
        if os.path.exists(meta_path):
            with open(meta_path, "r") as f:
                content = f.read()
                for line in content.split("\n"):
                    if line.startswith("Description:"):
                        desc = line.split(":", 1)[1].strip()
        print(f"[{i}] {b} - {desc}")
    
    return backups

def restore_version(version_name):
    source_dir = os.path.join(BACKUP_DIR, version_name)
    if not os.path.exists(source_dir):
        print(f"Error: La versión {version_name} no existe.")
        return

    print(f"\nRestaurando versión: {version_name}...")
    
    # Check that all files in backup actually exist in the version folder
    for file_path in FILES_TO_BACKUP:
        back_file = os.path.join(source_dir, file_path)
        if os.path.exists(back_file):
            # Target path is the root of the project
            target_path = file_path 
            os.makedirs(os.path.dirname(target_path), exist_ok=True)
            shutil.copy2(back_file, target_path)
            print(f"Restaurado: {file_path}")
        else:
            print(f"Aviso: El archivo {file_path} no estaba en este backup.")

    print("\n✅ Restauración completada con éxito. Por favor, sube los cambios a GitHub.")

if __name__ == "__main__":
    backups = list_backups()
    if backups:
        try:
            choice = input("\nElige el número del backup que quieres ACTIVAR: ")
            idx = int(choice)
            if 0 <= idx < len(backups):
                confirm = input(f"¿Estás seguro de que quieres sobreescribir los archivos actuales con la versión {backups[idx]}? (S/n): ")
                if confirm.lower() == 's':
                    restore_version(backups[idx])
                else:
                    print("Operación cancelada.")
            else:
                print("Número no válido.")
        except ValueError:
            print("Entrada no válida. Debes introducir un número.")
