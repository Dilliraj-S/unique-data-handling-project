<?php

// Example file demonstrating all possible query builds using the DataService class through the Data facade
// Assumes the Data facade is properly set up to point to App\Services\DataService
// Each section includes comments explaining the purpose and parameters
// Examples cover CRUD operations, filtering, joins, where clauses, grouping, and more

use App\Facades\Data;
use Illuminate\Support\Arr;

// ----------------------------------- 1. Create Operations -----------------------------------
// Creates a new record in the specified table with optional encryption and event dispatching

// Basic create: Adding a single user record
$result = Data::create('central', 'users', [
    'name' => 'Kiran',
    'email' => 'kiran@example.com',
    'password' => 'securepassword123',
]);

// Create with token key for event dispatching
$result = Data::create('business', 'customers', [
    'first_name' => 'Anita',
    'last_name' => 'Sharma',
    'phone' => '9876543210',
], 'user_token_123');

// ----------------------------------- 2. Update Operations -----------------------------------
// Updates records based on where conditions, supports encryption and soft deletes

// Basic update: Updating a user's email by ID
$result = Data::update('central', 'users', [
    'email' => 'new.kiran@example.com',
], ['id' => 1]);

// Update with complex where conditions
$result = Data::update('business', 'orders', [
    'status' => 'shipped',
    'updated_at' => now(),
], [
    'order_id' => 1001,
    'status' => ['operator' => '=', 'value' => 'pending'],
]);

// Update with token key and multiple conditions
$result = Data::update('central', 'skeleton_modules', [
    'module_name' => 'Updated Module',
], [
    'module_id' => 5,
    'is_active' => true,
], 'module_update_token');

// ----------------------------------- 3. Delete Operations -----------------------------------
// Deletes records with support for soft deletes and event dispatching

// Basic delete: Delete a user by ID
$result = Data::delete('central', 'users', ['id' => 2]);

// Soft delete: For tables with deleted_at column
$result = Data::delete('business', 'products', [
    'product_id' => 101,
    'category_id' => 3,
]);

// Delete with complex where clause
$result = Data::delete('central', 'role_permissions', [
    'role_id' => 1,
    'permission_id' => ['operator' => 'IN', 'value' => [10, 11, 12]],
], 'permission_delete_token');

// ----------------------------------- 4. Get Operations -----------------------------------
// Fetches records with customizable columns, joins, conditions, sorting, and pagination

// Basic get: Fetch all columns from users table
$result = Data::get('central', 'users');

// Get specific columns with limit
$result = Data::get('business', 'orders', [
    'columns' => ['order_id', 'customer_id', 'total_amount'],
], '10');

// Get with joins and where conditions
$result = Data::get('central', 'skeleton_items', [
    'columns' => [
        'skeleton_items.item_id',
        'skeleton_items.name AS item_name',
        'skeleton_sections.section_name',
    ],
    'joins' => [
        [
            'type' => 'inner',
            'table' => 'skeleton_sections',
            'on' => ['skeleton_items.section_id', 'skeleton_sections.section_id'],
        ],
    ],
    'where' => [
        'skeleton_items.is_active' => true,
        'skeleton_sections.section_id' => ['operator' => '=', 'value' => 5],
    ],
    'sort' => [
        ['column' => 'skeleton_items.item_id', 'direction' => 'desc'],
    ],
]);

// Get with group by and custom modifications
$result = Data::get('business', 'orders', [
    'columns' => ['customer_id', 'COUNT(*) AS order_count'],
    'groupBy' => ['customer_id'],
    'custom' => [
        [
            'type' => 'modify',
            'column' => 'order_count',
            'view' => '::(order_count > 10 ~ High Volume || Low Volume)::',
            'renderHtml' => false,
        ],
    ],
]);

// ----------------------------------- 5. Filter Operations -----------------------------------
// Advanced filtering with search, date ranges, column filters, sorting, and pagination

// Basic filter: Fetch all records with default pagination
$result = Data::filter('central', 'users', [
    'draw' => 1,
    'columns' => ['id', 'name', 'email'],
]);

// Filter with global search
$result = Data::filter('business', 'products', [
    'draw' => 2,
    'columns' => ['product_id', 'name', 'price'],
    'filters' => [
        'search' => ['value' => 'laptop'],
    ],
]);

// Filter with joins, complex where, and sorting
$result = Data::filter('central', 'skeleton_modules', [
    'draw' => 3,
    'columns' => [
        'skeleton_modules.module_id',
        'skeleton_modules.module_name',
        'skeleton_sections.section_name AS section',
    ],
    'joins' => [
        [
            'type' => 'left',
            'table' => 'skeleton_sections',
            'on' => ['skeleton_modules.section_id', 'skeleton_sections.section_id'],
        ],
    ],
    'filters' => [
        'where' => [
            'skeleton_modules.is_active' => true,
            'skeleton_sections.section_id' => ['operator' => 'IN', 'value' => [1, 2, 3]],
        ],
        'sort' => [
            ['column' => 'skeleton_modules.module_name', 'direction' => 'asc'],
        ],
    ],
]);

// Filter with date range and column-specific filters
$result = Data::filter('business', 'orders', [
    'draw' => 4,
    'columns' => ['order_id', 'customer_id', 'order_date', 'total_amount'],
    'filters' => [
        'dateRange stubborn' => [
            'order_date' => [
                'from' => '2025-01-01',
                'to' => '2025-06-30',
            ],
        ],
        'columns' => [
            'customer_id' => [
                'search' => ['value' => [101, 102, 103], 'regex' => false],
            ],
            'total_amount' => [
                'search' => ['value' => '1000', 'regex' => false],
            ],
        ],
        'pagination' => ['page' => 2, 'limit' => 20],
    ],
]);

// Filter with regex search and group by
$result = Data::filter('central', 'user_permissions', [
    'draw' => 5,
    'columns' => ['user_id', 'COUNT(*) AS permission_count'],
    'filters' => [
        'search' => [
            'regex' => [
                'user_permissions.permission_name' => 'view|edit',
            ],
        ],
        'groupBy' => ['user_id'],
    ],
]);

// Filter with advanced where conditions (AND/OR nesting)
$result = Data::filter('business', 'customers', [
    'draw' => 6,
    'columns' => ['customer_id', 'first_name', 'last_name', 'email'],
    'filters' => [
        'where' => [
            'condition' => 'OR',
            'clauses' => [
                ['email' => ['operator' => 'LIKE', 'value' => '%@example.com']],
                [
                    'condition' => 'AND',
                    'clauses' => [
                        ['status' => 'active'],
                        ['created_at' => ['operator' => '>=', 'value' => '2025-01-01']],
                    ],
                ],
            ],
        ],
    ],
]);

// ----------------------------------- 6. Advanced Query Examples -----------------------------------
// Combining multiple features for complex queries

// Complex get with joins, where, and custom modifications
$result = Data::get('central', 'skeleton_items', [
    'columns' => [
        'skeleton_items.item_id',
        'skeleton_items.name AS item_name',
        'skeleton_sections.section_name',
        'skeleton_modules.module_name AS module',
    ],
    'joins' => [
        [
            'type' => 'inner',
            'table' => 'skeleton_sections',
            'on' => ['skeleton_items.section_id', 'skeleton_sections.section_id'],
        ],
        [
            'type' => 'left',
            'table' => 'skeleton_modules',
            'on' => ['skeleton_sections.module_id', 'skeleton_modules.module_id'],
        ],
    ],
    'where' => [
        'skeleton_items.is_active' => true,
        'skeleton_sections.section_id' => ['operator' => 'IN', 'value' => [1, 2]],
        'condition' => 'AND',
        'clauses' => [
            ['skeleton_modules.module_name' => ['operator' => 'LIKE', 'value' => '%admin%']],
        ],
    ],
    'sort' => [
        ['column' => 'skeleton_items.item_id', 'direction' => 'asc'],
        ['column' => 'skeleton_sections.section_name', 'direction' => 'desc'],
    ],
    'custom' => [
        [
            'type' => 'modify',
            'column' => 'item_name',
            'view' => '::(item_name LIKE %premium% ~ Premium Item || Standard Item)::',
            'renderHtml' => true,
        ],
    ],
]);

// Complex filter with all features combined
$result = Data::filter('business', 'orders', [
    'draw' => 7,
    'columns' => [
        'orders.order_id',
        'orders.order_date',
        'customers.first_name AS customer_name',
        'products.name AS product_name',
        'orders.total_amount',
    ],
    'joins' => [
        [
            'type' => 'inner',
            'table' => 'customers',
            'on' => ['orders.customer_id', 'customers.customer_id'],
        ],
        [
            'type' => 'left',
            'table' => 'products',
            'on' => ['orders.product_id', 'products.product_id'],
        ],
    ],
    'filters' => [
        'search' => ['value' => 'electronics'],
        'where' => [
            'condition' => 'AND',
            'clauses' => [
                ['orders.status' => 'completed'],
                ['orders.total_amount' => ['operator' => '>=', 'value' => 500]],
                [
                    'condition' => 'OR',
                    'clauses' => [
                        ['customers.first_name' => ['operator' => 'LIKE', 'value' => '%Kiran%']],
                        ['customers.last_name' => ['operator' => 'LIKE', 'value' => '%Sharma%']],
                    ],
                ],
            ],
        ],
        'dateRange' => [
            'orders.order_date' => [
                'from' => '2025-01-01',
                'to' => '2025-12-31',
            ],
        ],
        'columns' => [
            'products.name' => [
                'search' => ['value' => 'laptop|phone', 'regex' => true],
            ],
        ],
        'sort' => [
            ['column' => 'orders.order_date', 'direction' => 'desc'],
            ['column' => 'orders.total_amount', 'direction' => 'asc'],
        ],
        'groupBy' => ['orders.order_id', 'customers.first_name'],
        'pagination' => ['page' => 1, 'limit' => 50],
    ],
    'custom' => [
        [
            'type' => 'modify',
            'column' => 'total_amount',
            'view' => '::(total_amount > 1000 ~ High Value || Regular)::',
            'renderHtml' => true,
        ],
    ],
]);

// ----------------------------------- Notes -----------------------------------
// 1. All operations handle encryption automatically for tables listed in encrypted_tables
// 2. Soft deletes are applied automatically for tables with deleted_at or deleted_on columns
// 3. Cache is used to optimize schema checks and encryption checks (TTL: 2 hours)
// 4. Events (SkeletonEvent or TableEvent) are dispatched for skeleton tables or with tokenKey
// 5. Joins support 'inner', 'left', and 'right' types
// 6. Where clauses support nested AND/OR conditions, operators (=, !=, >, <, >=, <=, LIKE, IN, NOT IN)
// 7. Filter operations support advanced search, regex, date ranges, and column-specific filters
// 8. Custom modifications allow conditional formatting of column values
// 9. Pagination defaults to 10 records per page unless specified
// 10. All operations include robust error handling and logging via Developer facade
// ----------------------------------- 1. Basic WHERE IN Query -----------------------------------
// Fetches records where a single column matches any value in an array

$result = Data::get('central', 'users', [
    'columns' => ['id', 'name', 'email'],
    'where' => [
        'id' => ['operator' => 'IN', 'value' => [1, 2, 3, 4, 5]], // Matches users with IDs 1, 2, 3, 4, or 5
    ],
]);

// Alternative syntax: Direct array for WHERE IN
$result = Data::get('business', 'products', [
    'columns' => ['product_id', 'name', 'price'],
    'where' => [
        'category_id' => [10, 20, 30], // Matches products in categories 10, 20, or 30
    ],
]);

// ----------------------------------- 2. WHERE IN with Multiple Columns -----------------------------------
// Fetches records where multiple columns each match values in their respective arrays

$result = Data::get('central', 'skeleton_items', [
    'columns' => ['item_id', 'name', 'section_id'],
    'where' => [
        'section_id' => ['operator' => 'IN', 'value' => [100, 101, 102]], // Matches specific section IDs
        'status' => ['operator' => 'IN', 'value' => ['active', 'pending']], // Matches specific statuses
    ],
]);

// ----------------------------------- 3. WHERE IN with Joins -----------------------------------
// Fetches records with WHERE IN combined with table joins

$result = Data::get('business', 'orders', [
    'columns' => [
        'orders.order_id',
        'orders.order_date',
        'customers.first_name AS customer_name',
    ],
    'joins' => [
        [
            'type' => 'inner',
            'table' => 'customers',
            'on' => ['orders.customer_id', 'customers.customer_id'],
        ],
    ],
    'where' => [
        'orders.customer_id' => ['operator' => 'IN', 'value' => [201, 202, 203]], // Matches specific customer IDs
        'customers.status' => 'active', // Additional condition on joined table
    ],
]);

// Complex join with multiple WHERE IN conditions
$result = Data::get('central', 'skeleton_items', [
    'columns' => [
        'skeleton_items.item_id',
        'skeleton_items.name AS item_name',
        'skeleton_sections.section_name',
        'skeleton_modules.module_name AS module',
    ],
    'joins' => [
        [
            'type' => 'inner',
            'table' => 'skeleton_sections',
            'on' => ['skeleton_items.section_id', 'skeleton_sections.section_id'],
        ],
        [
            'type' => 'left',
            'table' => 'skeleton_modules',
            'on' => ['skeleton_sections.module_id', 'skeleton_modules.module_id'],
        ],
    ],
    'where' => [
        'skeleton_items.item_id' => ['operator' => 'IN', 'value' => [1, 2, 3, 4]], // Matches specific item IDs
        'skeleton_sections.section_id' => ['operator' => 'IN', 'value' => [10, 11]], // Matches specific section IDs
        'skeleton_modules.module_name' => ['operator' => 'IN', 'value' => ['admin', 'user']], // Matches specific module names
    ],
]);

// ----------------------------------- 4. WHERE IN with Sorting -----------------------------------
// Fetches records with WHERE IN and custom sorting

$result = Data::get('central', 'users', [
    'columns' => ['id', 'name', 'email', 'created_at'],
    'where' => [
        'id' => ['operator' => 'IN', 'value' => [1, 5, 10, 15]], // Matches specific user IDs
    ],
    'sort' => [
        ['column' => 'created_at', 'direction' => 'desc'], // Sort by creation date descending
        ['column' => 'name', 'direction' => 'asc'], // Then by name ascending
    ],
]);

// ----------------------------------- 5. WHERE IN with Pagination -----------------------------------
// Fetches records with WHERE IN and pagination

$result = Data::get('business', 'products', [
    'columns' => ['product_id', 'name', 'price', 'category_id'],
    'where' => [
        'product_id' => ['operator' => 'IN', 'value' => [101, 102, 103, 104, 105]], // Matches specific product IDs
    ],
    'sort' => [
        ['column' => 'price', 'direction' => 'asc'],
    ],
], '10'); // Limit to 10 records per page

// ----------------------------------- 6. WHERE IN with Nested AND/OR Conditions -----------------------------------
// Fetches records with WHERE IN combined with nested AND/OR conditions

$result = Data::get('central', 'user_permissions', [
    'columns' => ['user_id', 'permission_name', 'created_at'],
    'where' => [
        'condition' => 'AND',
        'clauses' => [
            ['user_id' => ['operator' => 'IN', 'value' => [1, 2, 3]]], // Matches specific user IDs
            [
                'condition' => 'OR',
                'clauses' => [
                    ['permission_name' => ['operator' => 'IN', 'value' => ['view', 'edit']]], // Matches specific permissions
                    ['created_at' => ['operator' => '>=', 'value' => '2025-01-01']],
                ],
            ],
        ],
    ],
]);

// ----------------------------------- 7. WHERE IN with Search and Date Range -----------------------------------
// Fetches records with WHERE IN combined with global search and date range

$result = Data::get('business', 'orders', [
    'columns' => ['order_id', 'customer_id', 'order_date', 'total_amount'],
    'where' => [
        'customer_id' => ['operator' => 'IN', 'value' => [201, 202, 203]], // Matches specific customer IDs
    ],
    'search' => [
        'value' => 'electronics', // Global search across columns
    ],
    'dateRange' => [
        'order_date' => [
            'from' => '2025-01-01',
            'to' => '2025-06-30',
        ],
    ],
]);

// ----------------------------------- 8. WHERE IN with Group By -----------------------------------
// Fetches records with WHERE IN and group by for aggregation

$result = Data::get('central', 'skeleton_items', [
    'columns' => ['section_id', 'COUNT(*) AS item_count'],
    'where' => [
        'section_id' => ['operator' => 'IN', 'value' => [100, 101, 102]], // Matches specific section IDs
    ],
    'groupBy' => ['section_id'], // Group by section_id to count items per section
]);

// ----------------------------------- 9. WHERE IN with Custom Modifications -----------------------------------
// Fetches records with WHERE IN and custom column modifications

$result = Data::get('business', 'products', [
    'columns' => ['product_id', 'name', 'price'],
    'where' => [
        'product_id' => ['operator' => 'IN', 'value' => [101, 102, 103]], // Matches specific product IDs
    ],
    'custom' => [
        [
            'type' => 'modify',
            'column' => 'price',
            'view' => '::(price > 1000 ~ Expensive || Affordable)::', // Label products based on price
            'renderHtml' => true,
        ],
    ],
]);

// ----------------------------------- 10. Complex WHERE IN with All Features -----------------------------------
// Combines WHERE IN with joins, nested conditions, search, date range, sorting, pagination, group by, and custom modifications

$result = Data::get('central', 'skeleton_items', [
    'columns' => [
        'skeleton_items.item_id',
        'skeleton_items.name AS item_name',
        'skeleton_sections.section_name',
        'skeleton_modules.module_name AS module',
        'COUNT(skeleton_items.item_id) AS item_count',
    ],
    'joins' => [
        [
            'type' => 'inner',
            'table' => 'skeleton_sections',
            'on' => ['skeleton_items.section_id', 'skeleton_sections.section_id'],
        ],
        [
            'type' => 'left',
            'table' => 'skeleton_modules',
            'on' => ['skeleton_sections.module_id', 'skeleton_modules.module_id'],
        ],
    ],
    'where' => [
        'condition' => 'AND',
        'clauses' => [
            ['skeleton_items.item_id' => ['operator' => 'IN', 'value' => [1, 2, 3, 4, 5]]], // Matches specific item IDs
            ['skeleton_sections.section_id' => ['operator' => 'IN', 'value' => [10, 11, 12]]], // Matches specific section IDs
            [
                'condition' => 'OR',
                'clauses' => [
                    ['skeleton_modules.module_name' => ['operator' => 'LIKE', 'value' => '%admin%']],
                    ['skeleton_items.created_at' => ['operator' => '>=', 'value' => '2025-01-01']],
                ],
            ],
        ],
    ],
    'search' => [
        'value' => 'premium', // Search for 'premium' in any column
    ],
    'dateRange' => [
        'skeleton_items.created_at' => [
            'from' => '2025-01-01',
            'to' => '2025-12-31',
        ],
    ],
    'sort' => [
        ['column' => 'skeleton_items.item_id', 'direction' => 'asc'],
        ['column' => 'skeleton_sections.section_name', 'direction' => 'desc'],
    ],
    'groupBy' => ['skeleton_items.item_id', 'skeleton_sections.section_name', 'skeleton_modules.module_name'],
    'custom' => [
        [
            'type' => 'modify',
            'column' => 'item_name',
            'view' => '::(item_name LIKE %premium% ~ Premium Item || Standard Item)::', // Conditional labeling
            'renderHtml' => true,
        ],
    ],
], '20'); // Limit to 20 records per page

// ----------------------------------- Notes -----------------------------------
// 1. The 'where' parameter supports 'IN' operator explicitly with ['operator' => 'IN', 'value' => [...]]
// 2. Direct array syntax (e.g., 'column' => [1, 2, 3]) is treated as WHERE IN
// 3. Soft deletes are automatically applied for tables with deleted_at or deleted_on columns
// 4. Encryption is handled automatically for encrypted tables
// 5. Cache is used for schema and encryption checks (TTL: 2 hours)
// 6. Joins support 'inner', 'left', and 'right' types
// 7. Nested conditions allow combining WHERE IN with AND/OR logic
// 8. Custom modifications can transform output based on conditions
// 9. All queries include robust error handling and logging via Developer facade
// 10. Use fully qualified column names (e.g., table.column) when ambiguity is possible with joins
?>