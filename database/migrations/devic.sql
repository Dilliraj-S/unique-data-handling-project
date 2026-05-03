<?php

CREATE TABLE device_settings (
    id INT PRIMARY KEY AUTO_INCREMENT,
    device_id INT NOT NULL,
    trans_stamp VARCHAR(50),
    attlog_stamp VARCHAR(50) DEFAULT 'None',
    op_stamp VARCHAR(50),
    operlog_stamp VARCHAR(50) DEFAULT 'None',
    photo_stamp VARCHAR(50),
    attphoto_stamp VARCHAR(50) DEFAULT 'None',
    error_delay INT DEFAULT 30,
    delay INT DEFAULT 1,
    trans_times VARCHAR(50) DEFAULT '09:00;18:30',
    trans_interval INT DEFAULT 1,
    trans_flag VARCHAR(20) DEFAULT '111111101101',
    realtime INT DEFAULT 1,
    timeout INT DEFAULT 30,
    timezone INT,
    encrypt INT DEFAULT 0,
    memory_alert INT DEFAULT 0,
    memory_threshold INT DEFAULT 90000,
    memory_interval INT DEFAULT 60,
    attlog_alert INT DEFAULT 0,
    attlog_threshold INT DEFAULT 4,
    attlog_interval INT DEFAULT 60,
    created_by VARCHAR(30) DEFAULT NULL
    updated_by VARCHAR(30) DEFAULT NULL
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    FOREIGN KEY (device_id) REFERENCES devices(device_id),
    UNIQUE KEY unique_device_settings (device_id)
);