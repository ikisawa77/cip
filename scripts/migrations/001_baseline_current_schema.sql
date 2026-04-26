CREATE TABLE IF NOT EXISTS users (
  id VARCHAR(36) PRIMARY KEY,
  email VARCHAR(255) NOT NULL,
  password_hash VARCHAR(255) NOT NULL,
  display_name VARCHAR(120) NOT NULL,
  role ENUM('customer', 'admin') NOT NULL DEFAULT 'customer',
  wallet_balance_cents INT NOT NULL DEFAULT 0,
  created_at DATETIME NOT NULL,
  updated_at DATETIME NOT NULL,
  UNIQUE KEY users_email_unique (email)
) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS oauth_accounts (
  id VARCHAR(36) PRIMARY KEY,
  user_id VARCHAR(36) NOT NULL,
  provider ENUM('line', 'google', 'discord') NOT NULL,
  provider_user_id VARCHAR(191) NOT NULL,
  created_at DATETIME NOT NULL
) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS sessions (
  id VARCHAR(36) PRIMARY KEY,
  user_id VARCHAR(36) NOT NULL,
  token VARCHAR(191) NOT NULL,
  expires_at DATETIME NOT NULL,
  created_at DATETIME NOT NULL
) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS password_reset_otps (
  id VARCHAR(36) PRIMARY KEY,
  user_id VARCHAR(36) NOT NULL,
  email VARCHAR(255) NOT NULL,
  otp VARCHAR(6) NOT NULL,
  expires_at DATETIME NOT NULL,
  consumed_at DATETIME NULL,
  created_at DATETIME NOT NULL
) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS site_contents (
  id VARCHAR(36) PRIMARY KEY,
  content_key VARCHAR(120) NOT NULL,
  value_json TEXT NOT NULL,
  updated_at DATETIME NOT NULL,
  UNIQUE KEY site_contents_key_unique (content_key)
) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS categories (
  id VARCHAR(36) PRIMARY KEY,
  slug VARCHAR(120) NOT NULL,
  name VARCHAR(120) NOT NULL,
  description TEXT NULL,
  icon VARCHAR(120) NULL,
  created_at DATETIME NOT NULL,
  updated_at DATETIME NOT NULL
) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS products (
  id VARCHAR(36) PRIMARY KEY,
  category_id VARCHAR(36) NOT NULL,
  slug VARCHAR(160) NOT NULL,
  name VARCHAR(160) NOT NULL,
  description TEXT NOT NULL,
  type ENUM('TOPUP_API', 'DIGITAL_CODE', 'DOWNLOAD_LINK', 'PREMIUM_API', 'ID_PASS_ORDER', 'ACCOUNT_STOCK', 'RANDOM_POOL', 'WALLET_TOPUP') NOT NULL,
  price_cents INT NOT NULL,
  compare_at_cents INT NULL,
  delivery_note TEXT NULL,
  badge VARCHAR(80) NULL,
  cover_image TEXT NULL,
  is_active BOOLEAN NOT NULL DEFAULT TRUE,
  created_at DATETIME NOT NULL,
  updated_at DATETIME NOT NULL
) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS product_variants (
  id VARCHAR(36) PRIMARY KEY,
  product_id VARCHAR(36) NOT NULL,
  name VARCHAR(120) NOT NULL,
  price_cents INT NOT NULL,
  metadata_json TEXT NOT NULL,
  created_at DATETIME NOT NULL
) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS inventory_items (
  id VARCHAR(36) PRIMARY KEY,
  product_id VARCHAR(36) NOT NULL,
  kind ENUM('code', 'download_link', 'account', 'generic') NOT NULL,
  masked_label VARCHAR(255) NOT NULL,
  encrypted_payload TEXT NOT NULL,
  is_allocated BOOLEAN NOT NULL DEFAULT FALSE,
  created_at DATETIME NOT NULL,
  allocated_at DATETIME NULL
) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS random_pools (
  id VARCHAR(36) PRIMARY KEY,
  product_id VARCHAR(36) NOT NULL,
  inventory_item_id VARCHAR(36) NOT NULL,
  weight INT NOT NULL DEFAULT 1
) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS orders (
  id VARCHAR(36) PRIMARY KEY,
  user_id VARCHAR(36) NOT NULL,
  status ENUM('pending_payment', 'paid', 'processing', 'fulfilled', 'failed', 'manual_review', 'refunded') NOT NULL,
  subtotal_cents INT NOT NULL,
  total_cents INT NOT NULL,
  payment_method ENUM('wallet', 'promptpay_qr') NOT NULL,
  notes TEXT NULL,
  created_at DATETIME NOT NULL,
  updated_at DATETIME NOT NULL
) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS order_items (
  id VARCHAR(36) PRIMARY KEY,
  order_id VARCHAR(36) NOT NULL,
  product_id VARCHAR(36) NOT NULL,
  quantity INT NOT NULL,
  unit_price_cents INT NOT NULL,
  delivery_payload TEXT NULL,
  created_at DATETIME NOT NULL
) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS order_inputs (
  id VARCHAR(36) PRIMARY KEY,
  order_id VARCHAR(36) NOT NULL,
  input_json TEXT NOT NULL,
  created_at DATETIME NOT NULL
) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS payment_intents (
  id VARCHAR(36) PRIMARY KEY,
  user_id VARCHAR(36) NOT NULL,
  target_type ENUM('wallet', 'order') NOT NULL,
  target_id VARCHAR(36) NOT NULL,
  provider ENUM('promptpay_qr', 'kbiz_match', 'truemoney_gift') NOT NULL,
  status ENUM('pending', 'paid', 'expired', 'failed') NOT NULL,
  amount_cents INT NOT NULL,
  unique_amount_cents INT NOT NULL,
  reference_code VARCHAR(100) NOT NULL,
  expires_at DATETIME NOT NULL,
  paid_at DATETIME NULL,
  metadata_json TEXT NOT NULL,
  created_at DATETIME NOT NULL
) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS wallet_transactions (
  id VARCHAR(36) PRIMARY KEY,
  user_id VARCHAR(36) NOT NULL,
  type ENUM('pending_topup', 'topup_completed', 'purchase', 'refund', 'adjustment') NOT NULL,
  amount_cents INT NOT NULL,
  reference_id VARCHAR(36) NULL,
  detail TEXT NOT NULL,
  created_at DATETIME NOT NULL
) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS provider_configs (
  id VARCHAR(36) PRIMARY KEY,
  provider_key ENUM('promptpay', 'wepay', '24payseller', 'peamsub24hr', 'kbiz', 'truemoney', 'rdcw') NOT NULL,
  is_enabled BOOLEAN NOT NULL DEFAULT FALSE,
  config_json TEXT NOT NULL,
  updated_at DATETIME NOT NULL
) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS provider_order_links (
  id VARCHAR(36) PRIMARY KEY,
  order_id VARCHAR(36) NOT NULL,
  provider_key ENUM('promptpay', 'wepay', '24payseller', 'peamsub24hr', 'kbiz', 'truemoney', 'rdcw') NOT NULL,
  provider_order_id VARCHAR(191) NULL,
  latest_status VARCHAR(80) NOT NULL,
  request_json TEXT NULL,
  latest_payload_json TEXT NULL,
  created_at DATETIME NOT NULL,
  updated_at DATETIME NOT NULL,
  UNIQUE KEY provider_order_links_provider_order_unique (provider_key, provider_order_id)
) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS webhook_events (
  id VARCHAR(36) PRIMARY KEY,
  provider_key VARCHAR(60) NOT NULL,
  event_type VARCHAR(120) NOT NULL,
  payload_json TEXT NOT NULL,
  processed BOOLEAN NOT NULL DEFAULT FALSE,
  created_at DATETIME NOT NULL
) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS webhook_replay_attempts (
  id VARCHAR(36) PRIMARY KEY,
  webhook_event_id VARCHAR(36) NOT NULL,
  actor_user_id VARCHAR(36) NULL,
  ok BOOLEAN NOT NULL DEFAULT FALSE,
  message TEXT NOT NULL,
  created_at DATETIME NOT NULL
) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS provider_sync_files (
  id VARCHAR(36) PRIMARY KEY,
  provider_key ENUM('promptpay', 'wepay', '24payseller', 'peamsub24hr', 'kbiz', 'truemoney', 'rdcw') NOT NULL,
  file_path VARCHAR(255) NOT NULL,
  file_signature VARCHAR(191) NOT NULL,
  imported_at DATETIME NOT NULL,
  source_created_at DATETIME NULL,
  payload_json TEXT NOT NULL,
  UNIQUE KEY provider_sync_files_signature_unique (provider_key, file_signature)
) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS jobs (
  id VARCHAR(36) PRIMARY KEY,
  kind ENUM('provider_purchase', 'payment_match', 'provider_sync', 'cleanup') NOT NULL,
  status ENUM('pending', 'processing', 'completed', 'failed') NOT NULL,
  payload_json TEXT NOT NULL,
  attempts INT NOT NULL DEFAULT 0,
  available_at DATETIME NOT NULL,
  last_error TEXT NULL,
  created_at DATETIME NOT NULL,
  updated_at DATETIME NOT NULL
) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS audit_logs (
  id VARCHAR(36) PRIMARY KEY,
  actor_user_id VARCHAR(36) NULL,
  entity_type VARCHAR(80) NOT NULL,
  entity_id VARCHAR(36) NOT NULL,
  action VARCHAR(120) NOT NULL,
  detail TEXT NOT NULL,
  created_at DATETIME NOT NULL
) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
