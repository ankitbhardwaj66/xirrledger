-- Migration 0001: Initial schema
-- Captures the baseline xirr_sessions and support_emails_sent tables.

CREATE TABLE IF NOT EXISTS xirr_sessions (
    id                    INT          NOT NULL AUTO_INCREMENT PRIMARY KEY,
    session_id            VARCHAR(64)  NOT NULL UNIQUE,
    google_id             VARCHAR(100) DEFAULT NULL,
    name                  VARCHAR(100) DEFAULT NULL,
    email                 VARCHAR(100) DEFAULT NULL,
    broker                VARCHAR(100) DEFAULT NULL,
    status                VARCHAR(20)  NOT NULL DEFAULT 'pending',
    last_step             VARCHAR(50)  DEFAULT NULL,
    xirr                  DECIMAL(10,4) DEFAULT NULL,
    nifty_xirr            DECIMAL(10,4) DEFAULT NULL,
    report_url            TEXT         DEFAULT NULL,
    error_message         TEXT         DEFAULT NULL,
    created_at            DATETIME     NOT NULL DEFAULT CURRENT_TIMESTAMP,
    completed_at          DATETIME     DEFAULT NULL,
    support_email_sent_at DATETIME     DEFAULT NULL,
    device_type           VARCHAR(10)  DEFAULT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

CREATE TABLE IF NOT EXISTS support_emails_sent (
    email     VARCHAR(100) NOT NULL,
    sent_date DATE         NOT NULL,
    sent_at   DATETIME     NOT NULL DEFAULT CURRENT_TIMESTAMP,
    PRIMARY KEY (email, sent_date)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
