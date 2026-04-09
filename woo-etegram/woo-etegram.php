<?php
/*
Plugin Name: Etegrampay Payment Gateway
Description: This plugin integrates Etegrampay payment gateway for seamless payments on WooCommerce.
Version: 1.0.0
Author: Moses Edem
Author URI: https://github.com/mosesedem
Plugin URI: https://Etegram.com
License: GPL-2.0+
License URI: http://www.gnu.org/licenses/gpl-2.0.txt
Text Domain: Etegrampay
Domain Path: /languages
*/

define( 'WC_Etegrampay_MAIN_FILE', __FILE__ );
define( 'WC_Etegrampay_URL', untrailingslashit( plugins_url( '/', __FILE__ ) ) );

add_action( 'plugins_loaded', 'woocommerce_myplugin', 0 );

function woocommerce_myplugin() {
    if ( !class_exists( 'WC_Payment_Gateway' ) ) {
        return;
        // Exit if WooCommerce is not active
    }

    class WC_Gateway_Etegrampay extends WC_Payment_Gateway {
        public function __construct() {
            $this->id = 'etegrampay';
            $this->method_title = __( 'Etegrampay', 'Etegrampay' );
            $this->method_description = __( 'Accept payments via Etegrampay. Elevate your checkout experience with seamless transactions.', 'Etegrampay' );
            $this->has_fields = false;
            $this->icon = apply_filters( 'woocommerce_etegrampay_icon', WC_Etegrampay_URL . '/logo.png' );
            $this->supports = [ 'products' ];

            $this->init_form_fields();
            $this->init_settings();

            $this->title = $this->get_option( 'title', __( 'Etegrampay', 'Etegrampay' ) );
            $this->description = $this->get_option( 'description', __( 'Pay securely using Etegrampay.', 'Etegrampay' ) );
            $this->enabled = $this->get_option( 'enabled', 'no' );
            $this->api_key = $this->get_option( 'api_key', '' );
            $this->business_id = $this->get_option( 'business_id', '' );
            $this->webhook_secret = $this->get_option( 'webhook_secret', '' );
            $this->auto_complete_order = $this->get_option( 'auto_complete_order', 'no' );
            $this->debug = $this->get_option( 'debug', 'no' );

            if ( 'yes' === $this->debug ) {
                $this->log = new WC_Logger();
            }

            add_action( 'woocommerce_update_options_payment_gateways_' . $this->id, [ $this, 'process_admin_options' ] );
            add_action( 'admin_notices', [ $this, 'display_webhook_url_notice' ] );
        }

        public function init_form_fields() {
            $this->form_fields = [
                'enabled' => [
                    'title' => __( 'Enable/Disable', 'Etegrampay' ),
                    'type' => 'checkbox',
                    'label' => __( 'Enable Etegrampay Payment Gateway', 'Etegrampay' ),
                    'default' => 'no',
                ],
                'title' => [
                    'title' => __( 'Title', 'Etegrampay' ),
                    'type' => 'text',
                    'description' => __( 'This controls the title which the user sees during checkout.', 'Etegrampay' ),
                    'default' => __( 'Etegrampay', 'Etegrampay' ),
                    'desc_tip' => true,
                ],
                'description' => [
                    'title' => __( 'Description', 'Etegrampay' ),
                    'type' => 'textarea',
                    'description' => __( 'This controls the description which the user sees during checkout.', 'Etegrampay' ),
                    'default' => __( 'Pay securely using Etegrampay.', 'Etegrampay' ),
                    'desc_tip' => true,
                ],
                'api_key' => [
                    'title' => __( 'API Key', 'Etegrampay' ),
                    'type' => 'text',
                    'description' => __( 'Enter your Etegrampay public API key (get it from your Etegrampay dashboard).', 'Etegrampay' ),
                    'default' => '',
                ],
                'business_id' => [
                    'title' => __( 'Business ID', 'Etegrampay' ),
                    'type' => 'text',
                    'description' => __( 'Enter your Etegrampay business ID (find it in your Etegrampay dashboard).', 'Etegrampay' ),
                    'default' => '',
                ],
                'webhook_secret' => [
                    'title' => __( 'Webhook Secret', 'Etegrampay' ),
                    'type' => 'text',
                    'description' => __( 'Enter your Etegrampay webhook secret (optional, for verifying webhook requests).', 'Etegrampay' ),
                    'default' => '',
                ],
                'auto_complete_order' => [
                    'title' => __( 'Auto Complete Order', 'Etegrampay' ),
                    'type' => 'checkbox',
                    'label' => __( 'Automatically mark orders as "Completed" upon successful payment', 'Etegrampay' ),
                    'description' => __( 'If unchecked, orders will be marked as "Processing" instead.', 'Etegrampay' ),
                    'default' => 'no',
                ],
                'debug' => [
                    'title' => __( 'Debug Mode', 'Etegrampay' ),
                    'type' => 'checkbox',
                    'label' => __( 'Enable logging', 'Etegrampay' ),
                    'description' => __( 'Log Etegrampay API events to WooCommerce logs (view in WooCommerce > Status > Logs).', 'Etegrampay' ),
                    'default' => 'no',
                ],
            ];
        }

        public function process_payment( $order_id ) {
            $order = wc_get_order( $order_id );

            if ( !$this->api_key || !$this->business_id ) {
                wc_add_notice( __( 'Etegrampay payment gateway is not configured correctly. Please contact the site administrator.', 'Etegrampay' ), 'error' );
                $this->log( 'API key or Business ID missing.', 'error' );
                return [ 'result' => 'failure' ];
            }

            $payload = [
                'amount' => $order->get_total(),
                'email' => $order->get_billing_email(),
                'phone' => $order->get_billing_phone(),
                'firstname' => $order->get_billing_first_name(),
                'lastname' => $order->get_billing_last_name(),
                'reference' => 'order_' . $order_id . '_' . time(),
            ];

            $response = wp_remote_post( "https://api-checkout.etegram.com/api/transaction/initialize/{$this->business_id}", [
                'method' => 'POST',
                'headers' => [
                    'Content-Type' => 'application/json',
                    'Authorization' => "Bearer {$this->api_key}",
                ],
                'body' => json_encode( $payload ),
                'timeout' => 30,
            ] );

            if ( is_wp_error( $response ) ) {
                $error_message = $response->get_error_message();
                wc_add_notice( __( 'Payment initiation failed: ' . $error_message, 'Etegrampay' ), 'error' );
                $this->log( "Payment initiation failed: $error_message", 'error' );
                return [ 'result' => 'failure' ];
            }

            $body = wp_remote_retrieve_body( $response );
            $data = json_decode( $body, true );

            if ( !$data || !isset( $data[ 'status' ] ) || $data[ 'status' ] !== true || !isset( $data[ 'data' ][ 'authorization_url' ] ) ) {
                $error_message = isset( $data[ 'message' ] ) ? $data[ 'message' ] : 'Unknown error';
                wc_add_notice( __( 'Payment initiation failed: ' . $error_message, 'Etegrampay' ), 'error' );
                $this->log( "Payment initiation failed: $error_message", 'error' );
                return [ 'result' => 'failure' ];
            }

            $order->update_meta_data( '_etegrampay_reference', $data[ 'data' ][ 'reference' ] );
            $order->add_order_note( __( 'Etegrampay payment initiated. Reference: ' . $data[ 'data' ][ 'reference' ], 'Etegrampay' ) );
            $order->save();

            $this->log( "Payment initiated for order #$order_id. Redirecting to: " . $data[ 'data' ][ 'authorization_url' ], 'info' );

            return [
                'result' => 'success',
                'redirect' => $data[ 'data' ][ 'authorization_url' ],
            ];
        }

        public function handle_webhook( $request ) {
            $gateway = new self();
            $body = $request->get_body();
            $headers = $request->get_headers();

            if ( $gateway->webhook_secret ) {
                $signature = isset( $headers[ 'x_etegrampay_signature' ] ) ? $headers[ 'x_etegrampay_signature' ][ 0 ] : '';
                $expected_signature = hash_hmac( 'sha256', $body, $gateway->webhook_secret );

                if ( !hash_equals( $expected_signature, $signature ) ) {
                    $gateway->log( 'Webhook signature verification failed.', 'error' );
                    return new WP_Error( 'invalid_signature', __( 'Invalid webhook signature.', 'Etegrampay' ), [ 'status' => 401 ] );
                }
            }

            $data = json_decode( $body, true );
            if ( json_last_error() !== JSON_ERROR_NONE ) {
                $gateway->log( 'Invalid webhook JSON payload.', 'error' );
                return new WP_Error( 'invalid_json', __( 'Invalid JSON payload.', 'Etegrampay' ), [ 'status' => 400 ] );
            }

            $reference = isset( $data[ 'reference' ] ) ? sanitize_text_field( $data[ 'reference' ] ) : '';
            $status = isset( $data[ 'status' ] ) ? sanitize_text_field( $data[ 'status' ] ) : '';
            $is_reversed = isset( $data[ 'isReversed' ] ) ? ( bool ) $data[ 'isReversed' ] : false;
            $amount = isset( $data[ 'amount' ] ) ? ( int ) $data[ 'amount' ] : 0;
            $email = isset( $data[ 'email' ] ) ? sanitize_email( $data[ 'email' ] ) : '';

            if ( !$reference || !$status ) {
                $gateway->log( 'Webhook missing reference or status.', 'error' );
                return new WP_Error( 'missing_data', __( 'Missing reference or status.', 'Etegrampay' ), [ 'status' => 400 ] );
            }

            $orders = wc_get_orders( [ 'meta_key' => '_etegrampay_reference', 'meta_value' => $reference, 'limit' => 1 ] );
            if ( empty( $orders ) ) {
                $gateway->log( "No order found for reference: $reference", 'error' );
                return new WP_Error( 'invalid_order', __( 'No order found for this reference.', 'Etegrampay' ), [ 'status' => 404 ] );
            }

            $order = $orders[ 0 ];

            if ( $order->get_payment_method() !== $gateway->id ) {
                $gateway->log( "Webhook received for order #$order->get_id() with different payment method.", 'info' );
                return new WP_REST_Response( [ 'status' => 'ignored' ], 200 );
            }

            // Log webhook details
            $gateway->log( "Webhook received for order #$order->get_id(): Status: $status, Amount: $amount, Email: $email, Reversed: " . ( $is_reversed ? 'yes' : 'no' ), 'info' );

            if ( $status === 'successful' && !$is_reversed ) {
                $new_status = $gateway->auto_complete_order === 'yes' ? 'completed' : 'processing';
                if ( $order->get_status() !== $new_status ) {
                    $order->update_status( $new_status, __( 'Payment confirmed via Etegrampay webhook. Amount: ' . wc_price( $amount ), 'Etegrampay' ) );
                    $gateway->log( "Order #$order->get_id() updated to $new_status via webhook.", 'info' );
                } else {
                    $gateway->log( "Order #$order->get_id() already in $new_status state.", 'info' );
                }
            } elseif ( $status === 'failed' || $is_reversed ) {
                if ( $order->get_status() !== 'failed' ) {
                    $order->update_status( 'failed', __( 'Payment failed or reversed via Etegrampay webhook.', 'Etegrampay' ) );
                    $gateway->log( "Order #$order->get_id() marked as failed via webhook.", 'info' );
                } else {
                    $gateway->log( "Order #$order->get_id() already failed.", 'info' );
                }
            }

            return new WP_REST_Response( [ 'status' => 'success' ], 200 );
        }

        public function display_webhook_url_notice() {
            $screen = get_current_screen();
            if ( $screen->id !== 'woocommerce_page_wc-settings' || !isset( $_GET[ 'tab' ] ) || $_GET[ 'tab' ] !== 'checkout' || !isset( $_GET[ 'section' ] ) || $_GET[ 'section' ] !== $this->id ) {
                return;
            }

            $webhook_url = rest_url( 'etegrampay/v1/webhook' );
            ?>
            <div class = 'notice notice-info'>
            <p><?php _e( 'Webhook URL for Etegrampay integration:', 'Etegrampay' );
            ?> <strong><?php echo esc_url( $webhook_url );
            ?></strong></p>
            <p><?php _e( 'Copy this URL and configure it in your Etegrampay dashboard to receive payment notifications.', 'Etegrampay' );
            ?></p>
            </div>
            <?php
        }

        private function log( $message, $level = 'info' ) {
            if ( 'yes' === $this->debug && $this->log ) {
                $this->log->add( 'etegrampay', "[$level] $message" );
            }
        }
    }

    add_filter( 'woocommerce_payment_gateways', 'add_etegrampay' );
    add_action( 'rest_api_init', 'etegrampay_register_webhook_endpoint' );
}

function add_etegrampay( $gateways ) {
    $gateways[] = 'WC_Gateway_Etegrampay';
    return $gateways;
}

function etegrampay_register_webhook_endpoint() {
    register_rest_route( 'etegrampay/v1', '/webhook', [
        'methods' => 'POST',
        'callback' => [ new WC_Gateway_Etegrampay(), 'handle_webhook' ],
        'permission_callback' => '__return_true',
    ] );

    if ( class_exists( 'WC_Logger' ) ) {
        $logger = new WC_Logger();
        $logger->add( 'etegrampay', '[info] Webhook endpoint registered: ' . rest_url( 'etegrampay/v1/webhook' ) );
    }
}

function declare_cart_checkout_blocks_compatibility() {
    if ( class_exists( '\Automattic\WooCommerce\Utilities\FeaturesUtil' ) ) {
        \Automattic\WooCommerce\Utilities\FeaturesUtil::declare_compatibility( 'cart_checkout_blocks', WC_Etegrampay_MAIN_FILE, true );
    }
}
add_action( 'before_woocommerce_init', 'declare_cart_checkout_blocks_compatibility' );

add_action( 'woocommerce_blocks_loaded', 'etegrampay_register_order_approval_payment_method_type' );

function etegrampay_register_order_approval_payment_method_type() {
    if ( !class_exists( 'Automattic\WooCommerce\Blocks\Payments\Integrations\AbstractPaymentMethodType' ) ) {
        return;
    }

    class WC_Gateway_Etegrampay_Blocks extends Automattic\WooCommerce\Blocks\Payments\Integrations\AbstractPaymentMethodType {
        private $gateway;
        protected $name = 'etegrampay';

        public function initialize() {
            $this->settings = get_option( 'woocommerce_etegrampay_settings', [] );
            $this->gateway = new WC_Gateway_Etegrampay();
        }

        public function is_active() {
            return $this->gateway->is_available();
        }

        public function get_payment_method_script_handles() {
            wp_register_script(
                'etegrampay-blocks-integration',
                WC_Etegrampay_URL . '/assets/js/checkout.js',
                [ 'wc-blocks-registry', 'wc-settings', 'wp-element', 'wp-html-entities', 'wp-i18n' ],
                null,
                true
            );
            wp_localize_script( 'etegrampay-blocks-integration', 'EtegrampayData', [
                'icon' => $this->gateway->icon,
                'title' => $this->gateway->title,
            ] );
            if ( function_exists( 'wp_set_script_translations' ) ) {
                wp_set_script_translations( 'etegrampay-blocks-integration', 'Etegrampay', WC_Etegrampay_URL . '/languages' );
            }
            return [ 'etegrampay-blocks-integration' ];
        }

        public function get_payment_method_data() {
            return [
                'title' => $this->gateway->title,
                'description' => $this->gateway->description,
                'icon' => $this->gateway->icon,
            ];
        }
    }

    add_action(
        'woocommerce_blocks_payment_method_type_registration',

        function ( Automattic\WooCommerce\Blocks\Payments\PaymentMethodRegistry $payment_method_registry ) {
            $payment_method_registry->register( new WC_Gateway_Etegrampay_Blocks );
        }
    );
}