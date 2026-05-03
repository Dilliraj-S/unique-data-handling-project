<?php
// Database connection configuration
$host = 'localhost';
$dbname = 'got_it_v2';
$username = 'root';
$password = '';

try {
    // Initialize PDO connection
    $pdo = new PDO("mysql:host=$host;dbname=$dbname", $username, $password);
    $pdo->setAttribute(PDO::ATTR_ERRMODE, PDO::ERRMODE_EXCEPTION);
    $pdo->setAttribute(PDO::ATTR_DEFAULT_FETCH_MODE, PDO::FETCH_ASSOC);

    // Begin transaction
    $pdo->beginTransaction();

    // Standard permission actions
    $actions = ['create', 'view', 'edit', 'delete', 'import', 'export'];

    // Fetch existing permissions
    $stmt = $pdo->query("SELECT name FROM `permissions`");
    $existingPermissions = array_column($stmt->fetchAll(), 'name');

    // Get the maximum ID from permissions and role_permissions tables
    $stmt = $pdo->query("SELECT MAX(id) AS max_id FROM `permissions`");
    $permId = ($stmt->fetch()['max_id'] ?? 25) + 1; // Start after the highest ID
    $stmt = $pdo->query("SELECT MAX(id) AS max_id FROM `role_permissions`");
    $rolePermId = ($stmt->fetch()['max_id'] ?? 25) + 1; // Start after the highest ID

    // Fetch data from skeleton tables
    $modules = $pdo->query("SELECT name FROM `skeleton_modules` WHERE is_active = 1")->fetchAll();
    $sections = $pdo->query("
        SELECT s.name AS section_name, m.name AS module_name
        FROM `skeleton_sections` s
        JOIN `skeleton_modules` m ON s.module_id = m.module_id
        WHERE s.is_active = 1
    ")->fetchAll();
    $items = $pdo->query("
        SELECT i.name AS item_name, s.name AS section_name, m.name AS module_name
        FROM `skeleton_items` i
        JOIN `skeleton_sections` s ON i.section_id = s.section_id
        JOIN `skeleton_modules` m ON s.module_id = m.module_id
        WHERE i.is_active = 1
    ")->fetchAll();

    // Prepare statements for inserting with IGNORE
    $permStmt = $pdo->prepare("
        INSERT IGNORE INTO `permissions` (`id`, `name`, `created_by`, `updated_by`, `created_at`, `updated_at`)
        VALUES (:id, :name, 'system', NULL, '2025-05-19 10:10:16', '2025-05-19 10:10:16')
    ");
    $rolePermStmt = $pdo->prepare("
        INSERT IGNORE INTO `role_permissions` (`id`, `role_id`, `permission_id`, `created_by`, `updated_by`, `created_at`, `updated_at`)
        VALUES (:id, 1, :permission_id, 'system', NULL, '2025-05-19 10:10:16', '2025-05-19 10:10:16')
    ");

    $newPermissions = [];

    // Generate permissions for modules
    foreach ($modules as $module) {
        foreach ($actions as $action) {
            $permName = "{$action}:{$module['name']}";
            if (!in_array($permName, $existingPermissions)) {
                $newPermissions[] = ['id' => $permId, 'name' => $permName];
                $permId++;
            }
        }
    }

    // Generate permissions for sections
    foreach ($sections as $section) {
        foreach ($actions as $action) {
            $permName = "{$action}:{$section['module_name']}::{$section['section_name']}";
            if (!in_array($permName, $existingPermissions)) {
                $newPermissions[] = ['id' => $permId, 'name' => $permName];
                $permId++;
            }
        }
    }

    // Generate permissions for items
    foreach ($items as $item) {
        foreach ($actions as $action) {
            $permName = "{$action}:{$item['module_name']}::{$item['section_name']}::{$item['item_name']}";
            if (!in_array($permName, $existingPermissions)) {
                $newPermissions[] = ['id' => $permId, 'name' => $permName];
                $permId++;
            }
        }
    }

    // Insert new permissions and role_permissions
    foreach ($newPermissions as $perm) {
        // Insert into permissions
        $permStmt->execute([
            ':id' => $perm['id'],
            ':name' => $perm['name']
        ]);

        // Insert into role_permissions
        $rolePermStmt->execute([
            ':id' => $rolePermId,
            ':permission_id' => $perm['id']
        ]);
        $rolePermId++;
    }

    // Commit transaction
    $pdo->commit();
    echo "Permissions and role_permissions updated successfully. Added " . count($newPermissions) . " new permissions.\n";

} catch (PDOException $e) {
    // Roll back transaction on error
    $pdo->rollBack();
    echo "Error: " . $e->getMessage() . "\n";
} catch (Exception $e) {
    // Roll back transaction on error
    $pdo->rollBack();
    echo "General error: " . $e->getMessage() . "\n";
}
?>