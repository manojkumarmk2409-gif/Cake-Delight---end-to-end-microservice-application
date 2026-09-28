CREATE DATABASE IF NOT EXISTS catalog_db CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
CREATE DATABASE IF NOT EXISTS order_db CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
CREATE DATABASE IF NOT EXISTS rating_db CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
CREATE DATABASE IF NOT EXISTS notification_db CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
CREATE DATABASE IF NOT EXISTS user_db CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
CREATE DATABASE IF NOT EXISTS cart_db CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

CREATE USER IF NOT EXISTS 'cake_user'@'%' IDENTIFIED BY 'cake_pass';
GRANT ALL PRIVILEGES ON catalog_db.* TO 'cake_user'@'%';
GRANT ALL PRIVILEGES ON order_db.* TO 'cake_user'@'%';
GRANT ALL PRIVILEGES ON rating_db.* TO 'cake_user'@'%';
GRANT ALL PRIVILEGES ON notification_db.* TO 'cake_user'@'%';
GRANT ALL PRIVILEGES ON user_db.* TO 'cake_user'@'%';
GRANT ALL PRIVILEGES ON cart_db.* TO 'cake_user'@'%';
FLUSH PRIVILEGES;
