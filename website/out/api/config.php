<?php
/**
 * XIRR Ledger — PHP Bridge Config
 *
 * Set these values in Hostinger file manager after deploying:
 *
 *   DB_HOST   — usually 'localhost' on Hostinger shared hosting
 *   DB_NAME   — your MySQL database name (e.g. u123456789_xirr)
 *   DB_USER   — your MySQL username   (e.g. u123456789_xirr)
 *   DB_PASS   — your MySQL password
 *   API_SECRET — must match HOSTINGER_API_SECRET in terraform.tfvars
 */

// Block direct web requests to this file
if (realpath($_SERVER['SCRIPT_FILENAME'] ?? '') === __FILE__) {
    http_response_code(403);
    exit;
}

define('DB_HOST',     'xirrledger.com');
define('DB_NAME',     'u889244618_xirrledger');   // ← replace on Hostinger
define('DB_USER',     'u889244618_xirrledger');   // ← replace on Hostinger
define('DB_PASS',     'Q3^zkNwrXb');   // ← replace on Hostinger

// Must match HOSTINGER_API_SECRET in terraform/terraform.tfvars
define('API_SECRET',  '57913263fb8d236d3e3e7e61d8ad91923b94c8b10780f99b720217e6fd464114');
