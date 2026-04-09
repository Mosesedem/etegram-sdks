<?php
/*
Plugin Name: Etegrampay Payment Forms
Description: This plugin integrates Etegrampay payment gateway for seamless payments on wordpress applications.
Version: 1.0.0
Author: Moses Edem
Author URI: https://github.com/mosesedem
Plugin URI: https://Etegram.com
License: GPL-2.0+
License URI: http://www.gnu.org/licenses/gpl-2.0.txt
Text Domain: Etegrampay
Domain Path: /languages
*/

define('ETE_FORMS_DIR', plugin_dir_path(__FILE__));
define('ETE_FORMS_URL', plugin_dir_url(__FILE__));

// Table creation function
function etegrampay_forms_create_tables() {
    global $wpdb;
    $table_name = $wpdb->prefix . 'ete_form_entries'; // Resolves to sellerre_wp583_ete_form_entries
    $charset_collate = $wpdb->get_charset_collate();

    $sql = "CREATE TABLE $table_name (
        id BIGINT(20) UNSIGNED NOT NULL AUTO_INCREMENT,
        form_id BIGINT(20) UNSIGNED NOT NULL,
        entry_data LONGTEXT NOT NULL,
        payment_status VARCHAR(20) DEFAULT 'pending',
        payment_reference VARCHAR(100),
        payment_amount DECIMAL(10,2) DEFAULT 0.00,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        PRIMARY KEY (id)
    ) $charset_collate;";

    require_once(ABSPATH . 'wp-admin/includes/upgrade.php');
    dbDelta($sql);

    $table_exists = $wpdb->get_var("SHOW TABLES LIKE '$table_name'");
    if ($table_exists === $table_name) {
        error_log("Table $table_name created or verified successfully");
    } else {
        error_log("Failed to create or verify table $table_name");
    }
}

// Load plugin
add_action('init', 'etegrampay_forms_init');
add_action('rest_api_init', 'etegrampay_forms_register_webhook');
add_action('admin_enqueue_scripts', 'etegrampay_forms_enqueue_scripts');
add_action('wp_enqueue_scripts', 'etegrampay_forms_frontend_scripts');
add_action('admin_menu', 'etegrampay_forms_admin_menu');
add_action('add_meta_boxes', 'etegrampay_forms_meta_boxes');
add_action('save_post_ete_form', 'etegrampay_forms_save_meta', 10, 2);
add_shortcode('etegrampay_form', 'etegrampay_forms_shortcode');
add_action('wp_ajax_etegrampay_form_submit', 'etegrampay_form_submit_handler');
add_action('wp_ajax_nopriv_etegrampay_form_submit', 'etegrampay_form_submit_handler');

    function etegrampay_forms_init() {
    register_post_type('ete_form', [
        'labels' => ['name' => 'Etegrampay Forms', 'singular_name' => 'Form'],
        'public' => true,
        'show_ui' => true,
        'menu_icon' => 'dashicons-feedback',
        'supports' => ['title'],
        'has_archive' => true,
        'rewrite' => ['slug' => 'etegrampay-forms', 'with_front' => false],
        'publicly_queryable' => true,
        'exclude_from_search' => false,
        'query_var' => true,
        'capability_type' => 'post', // Ensure proper permissions
        'show_in_rest' => true, // Optional: Enable REST API support
    ]);

    // Create database table for entries
    global $wpdb;
    $table_name = $wpdb->prefix . 'ete_form_entries';
    $charset_collate = $wpdb->get_charset_collate();
    $sql = "CREATE TABLE IF NOT EXISTS $table_name (
        id BIGINT(20) UNSIGNED NOT NULL AUTO_INCREMENT,
        form_id BIGINT(20) UNSIGNED NOT NULL,
        entry_data LONGTEXT NOT NULL,
        payment_status VARCHAR(20) DEFAULT 'pending',
        payment_reference VARCHAR(100),
        payment_amount DECIMAL(10,2) DEFAULT 0.00,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        PRIMARY KEY (id)
    ) $charset_collate;";
    require_once(ABSPATH . 'wp-admin/includes/upgrade.php');
    dbDelta($sql);
}

function etegrampay_forms_add_form_to_content($content) {
    if (is_singular('ete_form') && in_the_loop() && is_main_query()) {
        $form_shortcode = '[etegrampay_form id="' . get_the_ID() . '"]';
        $content .= do_shortcode($form_shortcode);
    }
    return $content;
}
add_filter('the_content', 'etegrampay_forms_add_form_to_content');
// Enqueue scripts for form builder in admin
function etegrampay_forms_enqueue_scripts($hook) {
    if (!in_array($hook, ['post.php', 'post-new.php']) || get_post_type() !== 'ete_form') return;
    
    wp_enqueue_script('jquery-ui-sortable');
    wp_enqueue_script('etegrampay-form-builder', ETE_FORMS_URL . 'assets/js/form-builder.js', ['jquery', 'jquery-ui-sortable'], '1.2.0', true);
    wp_enqueue_style('etegrampay-form-builder-css', ETE_FORMS_URL . 'assets/css/form-builder.css');
    
    wp_localize_script('etegrampay-form-builder', 'eteFormsData', [
        'ajaxUrl' => admin_url('admin-ajax.php'),
        'nonce' => wp_create_nonce('ete_ajax_nonce'),
    ]);
}

// Frontend scripts
function etegrampay_forms_frontend_scripts() {
    wp_enqueue_style('etegrampay-forms-frontend', ETE_FORMS_URL . 'assets/css/frontend.css', [], '1.2.0');
    wp_enqueue_script('etegrampay-forms-frontend', ETE_FORMS_URL . 'assets/js/frontend.js', ['jquery'], '1.2.0', true);
    wp_localize_script('etegrampay-forms-frontend', 'eteFormsData', [
        'ajaxUrl' => admin_url('admin-ajax.php'),
        'nonce' => wp_create_nonce('ete_frontend_nonce'),
    ]);
}

function etegrampay_forms_admin_menu() {
    add_submenu_page(
        'edit.php?post_type=ete_form',
        'Entries',
        'Entries',
        'edit_posts', // Change from 'manage_options' to 'edit_posts' for editors and above
        'ete_form_entries',
        'etegrampay_forms_entries_page'
    );
    add_submenu_page(
        'edit.php?post_type=ete_form',
        'Settings',
        'Settings',
        'manage_options', // Keep this for admins only
        'ete_form_settings',
        'etegrampay_forms_settings_page'
    );
}


// Entries page with better formatting and filtering
function etegrampay_forms_entries_page() {
    global $wpdb;
    $form_filter = isset($_GET['form_filter']) ? intval($_GET['form_filter']) : 0;
    $status_filter = isset($_GET['status_filter']) ? sanitize_text_field($_GET['status_filter']) : '';

    $query = "SELECT * FROM {$wpdb->prefix}ete_form_entries WHERE 1=1";
    $params = [];

    if ($form_filter > 0) {
        $query .= " AND form_id = %d";
        $params[] = $form_filter;
    }

    if (!empty($status_filter)) {
        $query .= " AND payment_status = %s";
        $params[] = $status_filter;
    }

    $query .= " ORDER BY created_at DESC";
    $entries = !empty($params) ? $wpdb->get_results($wpdb->prepare($query, $params)) : $wpdb->get_results($query);
    $forms = get_posts(['post_type' => 'ete_form', 'numberposts' => -1]);

    ?>
    <div class="wrap">
        <h1>Form Entries</h1>
        <!-- Filter form unchanged -->
        <div class="tablenav top">
            <form method="get">
                <input type="hidden" name="page" value="ete_form_entries">
                <select name="form_filter">
                    <option value="0">All Forms</option>
                    <?php foreach ($forms as $form): ?>
                        <option value="<?php echo esc_attr($form->ID); ?>" <?php selected($form_filter, $form->ID); ?>><?php echo esc_html($form->post_title); ?></option>
                    <?php endforeach; ?>
                </select>
                <select name="status_filter">
                    <option value="">All Statuses</option>
                    <option value="pending" <?php selected($status_filter, 'pending'); ?>>Pending</option>
                    <option value="completed" <?php selected($status_filter, 'completed'); ?>>Completed</option>
                    <option value="failed" <?php selected($status_filter, 'failed'); ?>>Failed</option>
                </select>
                <input type="submit" class="button" value="Filter">
            </form>
        </div>

        <table class="wp-list-table widefat fixed striped">
            <thead>
                <tr>
                    <th>ID</th>
                    <th>Form</th>
                    <th>Submission Data</th>
                    <th>Amount</th>
                    <th>Status</th>
                    <th>Reference</th>
                    <th>Date</th>
                    <th>Actions</th>
                </tr>
            </thead>
            <tbody>
                <?php if (empty($entries)): ?>
                    <tr>
                        <td colspan="8">No entries found.</td>
                    </tr>
                <?php else: ?>
                    <?php foreach ($entries as $entry): ?>
                        <?php 
                        $form = get_post($entry->form_id);
                        $entry_data = json_decode($entry->entry_data, true);
                        $form_title = $form ? $form->post_title : 'Unknown Form';
                        ?>
                        <tr>
                            <td><?php echo esc_html($entry->id); ?></td>
                            <td><?php echo esc_html($form_title); ?></td>
                            <td>
                                <button type="button" class="button view-entry-data" data-entry="<?php echo esc_attr(wp_json_encode($entry_data)); ?>">View Data</button>
                            </td>
                            <td><?php echo esc_html(number_format($entry->payment_amount, 2)); ?></td>
                            <td>
                                <span class="status-badge status-<?php echo esc_attr($entry->payment_status); ?>">
                                    <?php echo esc_html(ucfirst($entry->payment_status)); ?>
                                </span>
                            </td>
                            <td><?php echo esc_html($entry->payment_reference); ?></td>
                            <td><?php echo esc_html($entry->created_at); ?></td>
                            <td>
                                <button type="button" class="button delete-entry" data-id="<?php echo esc_attr($entry->id); ?>">Delete</button>
                            </td>
                        </tr>
                    <?php endforeach; ?>
                <?php endif; ?>
            </tbody>
        </table>
    </div>

    <!-- Entry Data Modal -->
    <div id="entry-data-modal" style="display:none;" class="ete-modal">
        <div class="ete-modal-content">
            <span class="ete-modal-close">×</span>
            <h2>Entry Details</h2>
            <div id="entry-data-content"></div>
        </div>
    </div>

    <script>
    jQuery(document).ready(function($) {
        // View entry data
        $('.view-entry-data').click(function() {
            const data = $(this).data('entry');
            if (!data || !Array.isArray(data)) {
                $('#entry-data-content').html('<p>No data available or invalid format.</p>');
                $('#entry-data-modal').show();
                return;
            }

            let html = '<table class="wp-list-table widefat">';
            data.forEach(item => {
                if (item.name && item.value !== undefined) {
                    html += `<tr><th>${item.name}</th><td>${item.value}</td></tr>`;
                }
            });
            html += '</table>';

            if (html === '<table class="wp-list-table widefat"></table>') {
                html = '<p>No valid field data found.</p>';
            }

            $('#entry-data-content').html(html);
            $('#entry-data-modal').show();
        });

        // Close modal
        $('.ete-modal-close').click(function() {
            $('#entry-data-modal').hide();
        });

        // Delete entry (unchanged)
        $('.delete-entry').click(function() {
            if (confirm('Are you sure you want to delete this entry?')) {
                const entryId = $(this).data('id');
                console.log('Delete entry: ' + entryId);
                // Add AJAX delete logic here if needed
            }
        });
    });
    </script>
    
    <style>
    .ete-modal {
        position: fixed;
        z-index: 1000;
        left: 0;
        top: 0;
        width: 100%;
        height: 100%;
        background-color: rgba(0,0,0,0.4);
    }
    .ete-modal-content {
        background-color: #fff;
        margin: 10% auto;
        padding: 20px;
        border: 1px solid #888;
        width: 80%;
        max-width: 800px;
    }
    .ete-modal-close {
        color: #aaa;
        float: right;
        font-size: 28px;
        font-weight: bold;
        cursor: pointer;
    }
    .status-badge {
        padding: 3px 8px;
        border-radius: 3px;
        font-weight: bold;
    }
    .status-pending {
        background-color: #f8d7da;
        color: #721c24;
    }
    .status-completed {
        background-color: #d4edda;
        color: #155724;
    }
    .status-failed {
        background-color: #f8d7da;
        color: #721c24;
    }
    </style>
    <?php
}

function etegrampay_forms_settings_page() {
    if (isset($_POST['ete_save_settings']) && check_admin_referer('ete_settings_save')) {
        update_option('ete_api_key', sanitize_text_field($_POST['ete_api_key']));
        update_option('ete_business_id', sanitize_text_field($_POST['ete_business_id']));
        update_option('ete_webhook_secret', sanitize_text_field($_POST['ete_webhook_secret']));
        update_option('ete_success_page', absint($_POST['ete_success_page']));
        update_option('ete_cancel_page', absint($_POST['ete_cancel_page']));
        echo '<div class="updated"><p>Settings saved.</p></div>';
    }
    
    $api_key = get_option('ete_api_key', '');
    $business_id = get_option('ete_business_id', '');
    $webhook_secret = get_option('ete_webhook_secret', '');
    $success_page = get_option('ete_success_page', 0);
    $cancel_page = get_option('ete_cancel_page', 0);
    ?>
    
    
    <div class="wrap">
        <h1>Etegrampay Forms Settings</h1>
        
        <form method="post">
            <?php wp_nonce_field('ete_settings_save'); ?>
            
            <h2>API Settings</h2>
            <table class="form-table">
                <tr>
                    <th><label>API Key</label></th>
                    <td>
                        <input type="text" name="ete_api_key" value="<?php echo esc_attr($api_key); ?>" class="regular-text">
                        <p class="description">Your Etegrampay API key from the dashboard.</p>
                    </td>
                </tr>
                <tr>
                    <th><label>Business ID</label></th>
                    <td>
                        <input type="text" name="ete_business_id" value="<?php echo esc_attr($business_id); ?>" class="regular-text">
                        <p class="description">Your Etegrampay Business ID.</p>
                    </td>
                </tr>
                <tr>
                    <th><label>Webhook Secret</label></th>
                    <td>
                        <input type="text" name="ete_webhook_secret" value="<?php echo esc_attr($webhook_secret); ?>" class="regular-text">
                        <p class="description">Your webhook secret for verifying callbacks.</p>
                    </td>
                </tr>
                <tr>
                    <th><label>Webhook URL</label></th>
                    <td>
                        <code><?php echo esc_url(rest_url('etegrampay_forms/v1/webhook')); ?></code>
                        <p class="description">Copy this to your Etegrampay dashboard's webhook settings.</p>
                    </td>
                </tr>
            </table>
            
            <h2>Page Settings</h2>
            <table class="form-table">
                <tr>
                    <th><label>Success Page</label></th>
                    <td>
                        <?php
                        wp_dropdown_pages([
                            'name' => 'ete_success_page',
                            'show_option_none' => '— Select —',
                            'option_none_value' => '0',
                            'selected' => $success_page,
                        ]);
                        ?>
                        <p class="description">Users will be redirected here after successful payment.</p>
                    </td>
                </tr>
                <tr>
                    <th><label>Cancel Page</label></th>
                    <td>
                        <?php
                        wp_dropdown_pages([
                            'name' => 'ete_cancel_page',
                            'show_option_none' => '— Select —',
                            'option_none_value' => '0',
                            'selected' => $cancel_page,
                        ]);
                        ?>
                        <p class="description">Users will be redirected here if they cancel payment.</p>
                    </td>
                </tr>
            </table>
            
            <p class="submit">
                <input type="submit" name="ete_save_settings" class="button-primary" value="Save Settings">
            </p>
        </form>
    </div>
    <?php
}

// Form settings meta box
add_action('add_meta_boxes', 'etegrampay_forms_meta_boxes');
function etegrampay_forms_meta_boxes() {
    add_meta_box('ete_form_builder', 'Form Builder', 'etegrampay_forms_builder_callback', 'ete_form', 'normal', 'high');
    add_meta_box('ete_form_payment', 'Payment Settings', 'etegrampay_forms_payment_callback', 'ete_form', 'side', 'default');
    add_meta_box('ete_form_display', 'Display Settings', 'etegrampay_forms_display_callback', 'ete_form', 'side', 'default');
    add_meta_box('ete_form_shortcode', 'Shortcode', 'etegrampay_forms_shortcode_callback', 'ete_form', 'side', 'default');
}

// Modern form builder with drag and drop
function etegrampay_forms_builder_callback($post) {
    wp_nonce_field('ete_form_builder', 'ete_form_nonce');
    $fields = get_post_meta($post->ID, '_ete_form_fields', true) ?: [];
    $form_title = get_post_meta($post->ID, '_ete_form_title', true) ?: '';
    $form_description = get_post_meta($post->ID, '_ete_form_description', true) ?: '';
    ?>
    <div id="ete-form-builder-container">
        <div class="ete-form-settings">
            <p>
                <label for="ete_form_title">Form Title</label>
                <input type="text" id="ete_form_title" name="ete_form_title" value="<?php echo esc_attr($form_title); ?>" class="widefat">
            </p>
            <p>
                <label for="ete_form_description">Form Description</label>
                <textarea id="ete_form_description" name="ete_form_description" class="widefat" rows="3"><?php echo esc_textarea($form_description); ?></textarea>
            </p>
        </div>
        
        <div class="ete-builder-layout">
            <div class="ete-field-types">
                <h3>Add Field</h3>
                <div class="ete-field-buttons">
                    <button type="button" class="button field-button" data-type="text">Text</button>
                    <button type="button" class="button field-button" data-type="email">Email</button>
                    <button type="button" class="button field-button" data-type="tel">Phone</button>
                    <button type="button" class="button field-button" data-type="number">Number</button>
                    <button type="button" class="button field-button" data-type="textarea">Textarea</button>
                    <button type="button" class="button field-button" data-type="date">Date</button>
                    <button type="button" class="button field-button" data-type="select">Dropdown</button>
                    <button type="button" class="button field-button" data-type="radio">Radio</button>
                    <button type="button" class="button field-button" data-type="checkbox">Checkbox</button>
                </div>
                
                <div class="ete-field-settings" style="display: none;">
                    <h3>Field Settings</h3>
                    <p>
                        <label for="ete-field-label">Label</label>
                        <input type="text" id="ete-field-label" class="widefat">
                    </p>
                    <p>
                        <label for="ete-field-placeholder">Placeholder</label>
                        <input type="text" id="ete-field-placeholder" class="widefat">
                    </p>
                    <p class="ete-field-options" style="display: none;">
                        <label for="ete-field-options">Options (one per line)</label>
                        <textarea id="ete-field-options" class="widefat" rows="4"></textarea>
                    </p>
                    <p>
                        <label>
                            <input type="checkbox" id="ete-field-required"> Required
                        </label>
                    </p>
                    <div class="ete-field-actions">
                        <button type="button" class="button button-primary" id="ete-add-field">Add Field</button>
                        <button type="button" class="button" id="ete-cancel-field">Cancel</button>
                    </div>
                </div>
            </div>
            
            <div class="ete-form-preview">
                <h3>Form Preview</h3>
                <div id="ete-form-fields-container">
                    <p class="no-fields-message" <?php echo !empty($fields) ? 'style="display:none;"' : ''; ?>>
                        No fields added yet. Use the buttons on the left to add form fields.
                    </p>
                    <ul id="ete-fields-list" class="ete-sortable">
                        <?php foreach ($fields as $index => $field): ?>
                            <li class="ete-field-item" data-index="<?php echo esc_attr($index); ?>">
                                <div class="ete-field-header">
                                    <span class="ete-field-title"><?php echo esc_html($field['label']); ?> (<?php echo esc_html($field['type']); ?>)</span>
                                    <div class="ete-field-actions">
                                        <button type="button" class="ete-edit-field" title="Edit Field"><span class="dashicons dashicons-edit"></span></button>
                                        <button type="button" class="ete-clone-field" title="Duplicate Field"><span class="dashicons dashicons-admin-page"></span></button>
                                        <button type="button" class="ete-remove-field" title="Remove Field"><span class="dashicons dashicons-trash"></span></button>
                                    </div>
                                </div>
                                <div class="ete-field-preview">
                                    <?php if ($field['type'] === 'textarea'): ?>
                                        <textarea disabled placeholder="<?php echo esc_attr($field['placeholder'] ?? ''); ?>" <?php echo (!empty($field['required']) && $field['required']) ? 'required' : ''; ?>></textarea>
                                    <?php elseif ($field['type'] === 'select'): ?>
                                        <select disabled>
                                            <?php 
                                            $options = isset($field['options']) ? explode("\n", $field['options']) : [];
                                            foreach ($options as $option): ?>
                                                <option><?php echo esc_html(trim($option)); ?></option>
                                            <?php endforeach; ?>
                                        </select>
                                    <?php elseif ($field['type'] === 'radio'): ?>
                                        <?php 
                                        $options = isset($field['options']) ? explode("\n", $field['options']) : [];
                                        foreach ($options as $option): ?>
                                            <label><input type="radio" disabled> <?php echo esc_html(trim($option)); ?></label><br>
                                        <?php endforeach; ?>
                                    <?php elseif ($field['type'] === 'checkbox'): ?>
                                        <label><input type="checkbox" disabled> <?php echo esc_html($field['label']); ?></label>
                                    <?php else: ?>
                                        <input type="<?php echo esc_attr($field['type']); ?>" disabled placeholder="<?php echo esc_attr($field['placeholder'] ?? ''); ?>" <?php echo (!empty($field['required']) && $field['required']) ? 'required' : ''; ?>>
                                    <?php endif; ?>
                                </div>
                            </li>
                        <?php endforeach; ?>
                    </ul>
                </div>
            </div>
        </div>
        
        <input type="hidden" name="ete_form_fields" id="ete_form_fields" value="<?php echo esc_attr(json_encode($fields)); ?>">
    </div>
    
    <style>
    .ete-builder-layout {
        display: flex;
        gap: 20px;
        margin-top: 20px;
    }
    .ete-field-types {
        flex: 0 0 30%;
    }
    .ete-form-preview {
        flex: 0 0 65%;
        border: 1px solid #ddd;
        padding: 15px;
        border-radius: 4px;
    }
    .ete-field-buttons {
        display: flex;
        flex-wrap: wrap;
        gap: 5px;
        margin-bottom: 15px;
    }
    .ete-sortable {
        min-height: 50px;
        margin: 0;
        padding: 0;
    }
    .ete-field-item {
        border: 1px solid #ddd;
        margin-bottom: 10px;
        border-radius: 4px;
        background: #f9f9f9;
        cursor: move;
    }
    .ete-field-header {
        background: #f1f1f1;
        padding: 10px 15px;
        border-bottom: 1px solid #ddd;
        display: flex;
        justify-content: space-between;
        align-items: center;
    }
    .ete-field-preview {
        padding: 10px 15px;
    }
    .ete-field-preview input, 
    .ete-field-preview textarea, 
    .ete-field-preview select {
        width: 100%;
        opacity: 0.7;
    }
    </style>
    
    <script>
    jQuery(document).ready(function($) {
        // Initialize field data
        let fields = <?php echo json_encode($fields); ?>;
        let selectedFieldType = null;
        let editingIndex = -1;
        
        // Make fields sortable
        $("#ete-fields-list").sortable({
            placeholder: "ete-field-placeholder",
            update: function(event, ui) {
                updateFieldsOrder();
            }
        });
        
        // Field type button click
        $('.field-button').click(function() {
            selectedFieldType = $(this).data('type');
            $('.ete-field-types h3').text('Add ' + selectedFieldType.charAt(0).toUpperCase() + selectedFieldType.slice(1) + ' Field');
            $('.ete-field-settings').show();
            
            // Show/hide options field based on type
            if (['select', 'radio', 'checkbox'].includes(selectedFieldType)) {
                $('.ete-field-options').show();
            } else {
                $('.ete-field-options').hide();
            }
            
            // Clear input fields
            $('#ete-field-label').val('');
            $('#ete-field-placeholder').val('');
            $('#ete-field-options').val('');
            $('#ete-field-required').prop('checked', false);
        });
        
        // Add field button click
        $('#ete-add-field').click(function() {
            const label = $('#ete-field-label').val();
            if (!label) {
                alert('Please enter a field label');
                return;
            }
            
            const field = {
                type: selectedFieldType,
                label: label,
                name: label.toLowerCase().replace(/\s+/g, '_'),
                placeholder: $('#ete-field-placeholder').val(),
                required: $('#ete-field-required').is(':checked')
            };
            
            if (['select', 'radio', 'checkbox'].includes(selectedFieldType)) {
                field.options = $('#ete-field-options').val();
            }
            
            if (editingIndex >= 0) {
                // Update existing field
                fields[editingIndex] = field;
            } else {
                // Add new field
                fields.push(field);
            }
            
            updateFormPreview();
            resetFieldSettings();
        });
        
        // Cancel field button click
        $('#ete-cancel-field').click(function() {
            resetFieldSettings();
        });
        
        // Edit field
        $(document).on('click', '.ete-edit-field', function(e) {
            e.stopPropagation();
            const index = $(this).closest('.ete-field-item').data('index');
            editingIndex = index;
            const field = fields[index];
            
            selectedFieldType = field.type;
            $('.ete-field-types h3').text('Edit ' + field.type.charAt(0).toUpperCase() + field.type.slice(1) + ' Field');
            
            $('#ete-field-label').val(field.label);
            $('#ete-field-placeholder').val(field.placeholder || '');
            $('#ete-field-required').prop('checked', field.required || false);
            
            if (['select', 'radio', 'checkbox'].includes(field.type)) {
                $('.ete-field-options').show();
                $('#ete-field-options').val(field.options || '');
            } else {
                $('.ete-field-options').hide();
            }
            
            $('.ete-field-settings').show();
        });
        
        // Clone field
        $(document).on('click', '.ete-clone-field', function(e) {
            e.stopPropagation();
            const index = $(this).closest('.ete-field-item').data('index');
            const field = JSON.parse(JSON.stringify(fields[index])); // Deep clone
            field.label += ' (Copy)';
            field.name += '_copy';
            fields.push(field);
            updateFormPreview();
        });
        
        // Remove field
        $(document).on('click', '.ete-remove-field', function(e) {
            e.stopPropagation();
            if (confirm('Are you sure you want to remove this field?')) {
                const index = $(this).closest('.ete-field-item').data('index');
                fields.splice(index, 1);
                updateFormPreview();
            }
        });
        
        // Update form preview and hidden field
        function updateFormPreview() {
            const $list = $('#ete-fields-list');
            $list.empty();
            
            if (fields.length === 0) {
                $('.no-fields-message').show();
            } else {
                $('.no-fields-message').hide();
                fields.forEach((field, index) => {
                    let html = `
                        <li class="ete-field-item" data-index="${index}">
                            <div class="ete-field-header">
                                <span class="ete-field-title">${field.label} (${field.type})</span>
                                <div class="ete-field-actions">
                                    <button type="button" class="ete-edit-field" title="Edit Field"><span class="dashicons dashicons-edit"></span></button>
                                    <button type="button" class="ete-clone-field" title="Duplicate Field"><span class="dashicons dashicons-admin-page"></span></button>
                                    <button type="button" class="ete-remove-field" title="Remove Field"><span class="dashicons dashicons-trash"></span></button>
                                </div>
                            </div>
                            <div class="ete-field-preview">`;

                    if (field.type === 'textarea') {
                        html += `<textarea disabled placeholder="${field.placeholder || ''}" ${field.required ? 'required' : ''}></textarea>`;
                    } else if (field.type === 'select') {
                        html += '<select disabled>';
                        if (field.options) {
                            field.options.split('\n').forEach(option => {
                                html += `<option>${option.trim()}</option>`;
                            });
                        }
                        html += '</select>';
                    } else if (field.type === 'radio') {
                        if (field.options) {
                            field.options.split('\n').forEach(option => {
                                html += `<label><input type="radio" disabled> ${option.trim()}</label><br>`;
                            });
                        }
                    } else if (field.type === 'checkbox') {
                        html += `<label><input type="checkbox" disabled> ${field.label}</label>`;
                    } else {
                        html += `<input type="${field.type}" disabled placeholder="${field.placeholder || ''}" ${field.required ? 'required' : ''}>`;
                    }
                    
                    html += `</div></li>`;
                    $list.append(html);
                });
            }
            
            $('#ete_form_fields').val(JSON.stringify(fields));
        }
        
        // Update fields order after sorting
        function updateFieldsOrder() {
            const newOrder = [];
            $('#ete-fields-list .ete-field-item').each(function() {
                const index = $(this).data('index');
                newOrder.push(fields[index]);
            });
            fields = newOrder;
            updateFormPreview();
        }
        
        // Reset field settings form
        function resetFieldSettings() {
            $('.ete-field-settings').hide();
            selectedFieldType = null;
            editingIndex = -1;
            $('#ete-field-label').val('');
            $('#ete-field-placeholder').val('');
            $('#ete-field-options').val('');
            $('#ete-field-required').prop('checked', false);
            $('.ete-field-types h3').text('Add Field');
        }
        
        // Initialize form preview on load
        updateFormPreview();
    });
    </script>
    <?php
}

function etegrampay_forms_save_meta($post_id, $post) {
    if (!isset($_POST['ete_form_nonce']) || !wp_verify_nonce($_POST['ete_form_nonce'], 'ete_form_builder')) {
        return;
    }

    if (defined('DOING_AUTOSAVE') && DOING_AUTOSAVE) {
        return;
    }

    if ($post->post_type !== 'ete_form') {
        return;
    }

    // Save form fields
    if (isset($_POST['ete_form_fields'])) {
        $fields = json_decode(stripslashes($_POST['ete_form_fields']), true);
        update_post_meta($post_id, '_ete_form_fields', $fields);
    }

    // Save form title and description
    if (isset($_POST['ete_form_title'])) {
        update_post_meta($post_id, '_ete_form_title', sanitize_text_field($_POST['ete_form_title']));
    }
    if (isset($_POST['ete_form_description'])) {
        update_post_meta($post_id, '_ete_form_description', sanitize_textarea_field($_POST['ete_form_description']));
    }

    // Save payment settings
    if (isset($_POST['ete_payment_amount']) && wp_verify_nonce($_POST['ete_form_payment_nonce'], 'ete_form_payment')) {
        update_post_meta($post_id, '_ete_payment_amount', floatval($_POST['ete_payment_amount']));
    }
    if (isset($_POST['ete_payment_currency'])) {
        update_post_meta($post_id, '_ete_payment_currency', sanitize_text_field($_POST['ete_payment_currency']));
    }

    // Save display settings
    if (isset($_POST['ete_submit_text']) && wp_verify_nonce($_POST['ete_form_display_nonce'], 'ete_form_display')) {
        update_post_meta($post_id, '_ete_submit_text', sanitize_text_field($_POST['ete_submit_text']));
    }
}

// Payment settings meta box
function etegrampay_forms_payment_callback($post) {
    wp_nonce_field('ete_form_payment', 'ete_form_payment_nonce');
    $amount = get_post_meta($post->ID, '_ete_payment_amount', true);
    $currency = get_post_meta($post->ID, '_ete_payment_currency', true) ?: 'NGN';
    ?>
    <p>
        <label for="ete_payment_amount">Payment Amount</label>
        <input type="number" id="ete_payment_amount" name="ete_payment_amount" value="<?php echo esc_attr($amount); ?>" step="0.01" min="0" class="widefat">
    </p>
    <p>
        <label for="ete_payment_currency">Currency</label>
        <select id="ete_payment_currency" name="ete_payment_currency" class="widefat">
            <option value="NGN" <?php selected($currency, 'NGN'); ?>>NGN</option>
        </select>
    </p>
    <?php
}

// Display settings meta box
function etegrampay_forms_display_callback($post) {
    wp_nonce_field('ete_form_display', 'ete_form_display_nonce');
    $submit_text = get_post_meta($post->ID, '_ete_submit_text', true) ?: 'Submit';
    ?>
    <p>
        <label for="ete_submit_text">Submit Button Text</label>
        <input type="text" id="ete_submit_text" name="ete_submit_text" value="<?php echo esc_attr($submit_text); ?>" class="widefat">
    </p>
    <?php
}

// Shortcode meta box
function etegrampay_forms_shortcode_callback($post) {
    ?>
    <p>
        <input type="text" value="[etegrampay_form id='<?php echo $post->ID; ?>']" class="widefat" readonly>
        <p class="description">Copy this shortcode to display the form on any page or post.</p>
    </p>
    <?php
}

// Register webhook endpoint
function etegrampay_forms_register_webhook() {
    register_rest_route('etegrampay_forms/v1', '/webhook', [
        'methods' => 'POST',
        'callback' => 'etegrampay_forms_handle_webhook',
        'permission_callback' => '__return_true',
    ]);
}

// Handle webhook callback
function etegrampay_forms_handle_webhook(WP_REST_Request $request) {
    $body = $request->get_body();
    $data = json_decode($body, true);
    if (!$data || empty($data['reference']) || empty($data['status'])) {
        error_log("Invalid webhook payload: " . print_r($data, true));
        return new WP_Error('invalid_payload', 'Missing reference or status', ['status' => 400]);
    }

    global $wpdb;
    $table_name = $wpdb->prefix . 'ete_form_entries';

    $reference = sanitize_text_field($data['reference']);
    $parts = explode('_', $reference);
    if (count($parts) < 4 || $parts[0] !== 'form' || $parts[2] !== 'entry') {
        error_log("Invalid reference format: $reference");
        return new WP_Error('invalid_reference', 'Invalid reference format', ['status' => 400]);
    }

    $form_id = intval($parts[1]);
    $entry_id = intval($parts[3]);
    $new_status = ($data['status'] === 'successful') ? 'completed' : 'failed';

    // Get existing entry data for email
    $entry = $wpdb->get_row($wpdb->prepare("SELECT * FROM $table_name WHERE form_id = %d AND id = %d", $form_id, $entry_id));
    if (!$entry) {
        error_log("No entry found for form_id=$form_id, entry_id=$entry_id");
        return new WP_Error('not_found', 'Entry not found', ['status' => 404]);
    }

    $entry_data = json_decode($entry->entry_data, true);
    $payment_amount = floatval($entry->payment_amount);

    $updated = $wpdb->update(
        $table_name,
        [
            'payment_status' => $new_status,
            'payment_reference' => sanitize_text_field($data['id']),
            'payment_amount' => floatval($data['amount'])
        ],
        [
            'form_id' => $form_id,
            'id' => $entry_id
        ],
        ['%s', '%s', '%f'],
        ['%d', '%d']
    );

    if ($updated === false) {
        error_log("Webhook update failed: " . $wpdb->last_error);
        return new WP_Error('db_error', 'Database update failed', ['status' => 500]);
    }

    // Send email to admin for status update
    etegrampay_send_admin_email($form_id, $entry_id, $entry_data, $data['amount'], $new_status, $data['id']);

    error_log("Webhook processed: form_id=$form_id, entry_id=$entry_id, status=$new_status");
    return ['status' => 'success'];
}

function etegrampay_send_admin_email($form_id, $entry_id, $entry_data, $payment_amount, $payment_status, $payment_reference = '') {
    // Get admin email(s) - uses site admin email by default
    $admin_email = get_option('admin_email');
    $to = apply_filters('etegrampay_admin_email_recipients', $admin_email); // Allow customization

    // Email subject
    $subject = sprintf(
        '[Etegrampay Forms] %s - Form #%d, Entry #%d',
        ($payment_status === 'pending' ? 'New Submission' : 'Payment Update'),
        $form_id,
        $entry_id
    );

    // Email body
    $form_title = get_the_title($form_id) ?: 'Unknown Form';
    $body = "<h2>Etegrampay Forms Notification</h2>";
    $body .= "<p><strong>Event:</strong> " . ($payment_status === 'pending' ? 'New Form Submission' : 'Payment Status Updated') . "</p>";
    $body .= "<p><strong>Form:</strong> $form_title (#$form_id)</p>";
    $body .= "<p><strong>Entry ID:</strong> $entry_id</p>";
    $body .= "<p><strong>Payment Status:</strong> " . ucfirst($payment_status) . "</p>";
    $body .= "<p><strong>Payment Amount:</strong> " . number_format($payment_amount, 2) . " NGN</p>";
    if ($payment_reference) {
        $body .= "<p><strong>Payment Reference:</strong> $payment_reference</p>";
    }

    // Add submitted data
    $body .= "<h3>Submitted Data</h3>";
    $body .= "<table style='border-collapse: collapse; width: 100%;'>";
    $body .= "<tr><th style='border: 1px solid #ddd; padding: 8px;'>Field</th><th style='border: 1px solid #ddd; padding: 8px;'>Value</th></tr>";
    foreach ($entry_data as $field) {
        if (isset($field['name']) && isset($field['value'])) {
            $body .= "<tr>";
            $body .= "<td style='border: 1px solid #ddd; padding: 8px;'>" . esc_html($field['name']) . "</td>";
            $body .= "<td style='border: 1px solid #ddd; padding: 8px;'>" . esc_html($field['value']) . "</td>";
            $body .= "</tr>";
        }
    }
    $body .= "</table>";

    // Email headers
    $headers = [
        'Content-Type: text/html; charset=UTF-8',
        'From: Etegrampay Forms <' . get_option('admin_email') . '>',
    ];

    // Send email
    $sent = wp_mail($to, $subject, $body, $headers);
    if ($sent) {
        error_log("Email sent to $to for form_id=$form_id, entry_id=$entry_id, status=$payment_status");
    } else {
        error_log("Failed to send email for form_id=$form_id, entry_id=$entry_id");
    }
}

// Shortcode to display form
function etegrampay_forms_shortcode($atts) {
    $atts = shortcode_atts(['id' => 0], $atts);
    $form_id = intval($atts['id']);

    if (!$form_id || get_post_type($form_id) !== 'ete_form') {
        return '<p>Invalid form ID</p>';
    }

    $fields = get_post_meta($form_id, '_ete_form_fields', true);
    $title = get_post_meta($form_id, '_ete_form_title', true);
    $description = get_post_meta($form_id, '_ete_form_description', true);
    $submit_text = get_post_meta($form_id, '_ete_submit_text', true) ?: 'Submit';
    $amount = get_post_meta($form_id, '_ete_payment_amount', true);

    ob_start();
    ?>
<div class="etegrampay-form-container">
        <?php if ($title): ?>
            <h2><?php echo esc_html($title); ?></h2>
        <?php endif; ?>
        <?php if ($description): ?>
            <p><?php echo esc_html($description); ?></p>
        <?php endif; ?>
        <?php if ($amount): ?>
            <p>Payment Amount: <?php echo esc_html(number_format($amount, 2)) . ' ' . get_post_meta($form_id, '_ete_payment_currency', true); ?></p>
        <?php endif; ?>

        <form class="etegrampay-form" data-form-id="<?php echo esc_attr($form_id); ?>">
            <?php foreach ($fields as $field): ?>
                <div class="ete-form-field">
                    <label for="ete_field_<?php echo esc_attr($field['name']); ?>">
                        <?php echo esc_html($field['label']); ?>
                        <?php if ($field['required']): ?><span class="required">*</span><?php endif; ?>
                    </label>
                    
                    <?php if ($field['type'] === 'textarea'): ?>
                        <textarea 
                            name="<?php echo esc_attr($field['name']); ?>" 
                            id="ete_field_<?php echo esc_attr($field['name']); ?>" 
                            placeholder="<?php echo esc_attr($field['placeholder'] ?? ''); ?>"
                            <?php echo $field['required'] ? 'required' : ''; ?>
                        ></textarea>
                    <?php elseif ($field['type'] === 'select'): ?>
                        <select 
                            name="<?php echo esc_attr($field['name']); ?>" 
                            id="ete_field_<?php echo esc_attr($field['name']); ?>"
                            <?php echo $field['required'] ? 'required' : ''; ?>
                        >
                            <?php 
                            $options = isset($field['options']) ? explode("\n", $field['options']) : [];
                            foreach ($options as $option): ?>
                                <option value="<?php echo esc_attr(trim($option)); ?>">
                                    <?php echo esc_html(trim($option)); ?>
                                </option>
                            <?php endforeach; ?>
                        </select>
                    <?php elseif ($field['type'] === 'radio'): ?>
                        <?php 
                        $options = isset($field['options']) ? explode("\n", $field['options']) : [];
                        foreach ($options as $option): 
                            $option = trim($option);
                        ?>
                            <label>
                                <input 
                                    type="radio" 
                                    name="<?php echo esc_attr($field['name']); ?>" 
                                    value="<?php echo esc_attr($option); ?>"
                                    <?php echo $field['required'] ? 'required' : ''; ?>
                                > <?php echo esc_html($option); ?>
                            </label><br>
                        <?php endforeach; ?>
                    <?php elseif ($field['type'] === 'checkbox'): ?>
                        <label>
                            <input 
                                type="checkbox" 
                                name="<?php echo esc_attr($field['name']); ?>" 
                                id="ete_field_<?php echo esc_attr($field['name']); ?>"
                                <?php echo $field['required'] ? 'required' : ''; ?>
                            > <?php echo esc_html($field['label']); ?>
                        </label>
                    <?php else: ?>
                        <input 
                            type="<?php echo esc_attr($field['type']); ?>" 
                            name="<?php echo esc_attr($field['name']); ?>" 
                            id="ete_field_<?php echo esc_attr($field['name']); ?>" 
                            placeholder="<?php echo esc_attr($field['placeholder'] ?? ''); ?>"
                            <?php echo $field['required'] ? 'required' : ''; ?>
                        >
                    <?php endif; ?>
                </div>
            <?php endforeach; ?>
            <button type="submit" class="ete-submit-button"><?php echo esc_html($submit_text); ?></button>
        </form>
    </div>
    <?php
    return ob_get_clean();
}

// AJAX handler for form submission
function etegrampay_form_submit_handler() {
    check_ajax_referer('ete_frontend_nonce', 'nonce');

    $form_id = intval($_POST['form_id']);
    $form_data = isset($_POST['form_data']) ? $_POST['form_data'] : [];

    if (empty($form_data)) {
        wp_send_json_error(['message' => 'No form data provided']);
        return;
    }

    global $wpdb;
    $table_name = $wpdb->prefix . 'ete_form_entries';

    $entry_data = json_encode($form_data);
    $amount = floatval(get_post_meta($form_id, '_ete_payment_amount', true));
    $currency = get_post_meta($form_id, '_ete_payment_currency', true) ?: 'NGN';

    $result = $wpdb->insert(
        $table_name,
        [
            'form_id' => $form_id,
            'entry_data' => $entry_data,
            'payment_amount' => $amount,
            'payment_status' => 'pending',
            'created_at' => current_time('mysql')
        ],
        ['%d', '%s', '%f', '%s', '%s']
    );

    if ($result === false) {
        error_log("Insert failed: " . $wpdb->last_error);
        wp_send_json_error(['message' => 'Failed to save form entry: ' . $wpdb->last_error]);
        return;
    }

    $entry_id = $wpdb->insert_id;
    error_log("Entry saved with ID: $entry_id, Amount: $amount");

    // Send email to admin for new submission
    etegrampay_send_admin_email($form_id, $entry_id, $form_data, $amount, 'pending');
    
    
    // Get API credentials
    $api_key = get_option('ete_api_key');
    $business_id = get_option('ete_business_id');
    
    if (!$api_key || !$business_id) {
        wp_send_json_error(['message' => 'Payment gateway not configured']);
        return;
    }
    
    // Prepare payment payload
    $email = '';
    foreach ($form_data as $data) {
        if ($data['name'] === 'email' && !empty($data['value'])) {
            $email = sanitize_email($data['value']);
            break;
        }
    }
    
    $payload = [
        'first_name' => $email ?:'anonymous@user.com',
        'amount' => $amount,
        'email' => $email ?: 'anonymous@user.com', // Fallback email
        'reference' => "form_{$form_id}_entry_{$entry_id}_" . time(),
        'metadata' => ['entry_id' => $entry_id]
    ];
    
    // Make API request
    $response = wp_remote_post("https://api-checkout.etegram.com/api/transaction/initialize/{$business_id}", [
        'method' => 'POST',
        'headers' => [
            'Content-Type' => 'application/json',
            'Authorization' => "Bearer {$api_key}",
        ],
        'body' => json_encode($payload),
        'timeout' => 30,
    ]);
    
    if (is_wp_error($response)) {
        wp_send_json_error(['message' => 'Payment initiation failed: ' . $response->get_error_message()]);
        return;
    }
    
    $body = wp_remote_retrieve_body($response);
    $data = json_decode($body, true);
    
    if (!$data || !isset($data['status']) || $data['status'] !== true || !isset($data['data']['authorization_url'])) {
        $error_message = isset($data['message']) ? $data['message'] : 'Unknown error';
        wp_send_json_error(['message' => 'Payment initiation failed: ' . $error_message]);
        return;
    }
    
    // Update entry with reference
    $wpdb->update(
        $table_name,
        ['payment_reference' => $data['data']['reference']],
        ['id' => $entry_id]
    );
    
    wp_send_json_success([
        'redirect' => $data['data']['authorization_url']
    ]);
}


function etegrampay_forms_activate() {
    etegrampay_forms_init();
    etegrampay_forms_create_tables();
    flush_rewrite_rules(true);

    $installed_version = get_option('etegrampay_forms_version', '0');
    if (version_compare($installed_version, '1.1.1', '<')) {
        etegrampay_forms_create_tables();
        update_option('etegrampay_forms_version', '1.1.1');
    }
}

register_activation_hook(__FILE__, 'etegrampay_forms_activate');

function etegrampay_forms_deactivate() {
    flush_rewrite_rules();
}
register_deactivation_hook(__FILE__, 'etegrampay_forms_deactivate');