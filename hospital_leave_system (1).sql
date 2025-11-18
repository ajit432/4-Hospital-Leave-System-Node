-- phpMyAdmin SQL Dump
-- version 5.2.1
-- https://www.phpmyadmin.net/
--
-- Host: 127.0.0.1
-- Generation Time: Nov 18, 2025 at 06:32 AM
-- Server version: 10.4.32-MariaDB
-- PHP Version: 8.2.12

SET SQL_MODE = "NO_AUTO_VALUE_ON_ZERO";
START TRANSACTION;
SET time_zone = "+00:00";


/*!40101 SET @OLD_CHARACTER_SET_CLIENT=@@CHARACTER_SET_CLIENT */;
/*!40101 SET @OLD_CHARACTER_SET_RESULTS=@@CHARACTER_SET_RESULTS */;
/*!40101 SET @OLD_COLLATION_CONNECTION=@@COLLATION_CONNECTION */;
/*!40101 SET NAMES utf8mb4 */;

--
-- Database: `hospital_leave_system`
--

-- --------------------------------------------------------

--
-- Table structure for table `doctor_leave_balance`
--

CREATE TABLE `doctor_leave_balance` (
  `id` int(11) NOT NULL,
  `doctor_id` int(11) NOT NULL,
  `category_id` int(11) NOT NULL,
  `total_days` int(11) NOT NULL DEFAULT 0,
  `used_days` int(11) NOT NULL DEFAULT 0,
  `remaining_days` int(11) GENERATED ALWAYS AS (`total_days` - `used_days`) STORED,
  `year` int(11) NOT NULL,
  `created_at` timestamp NOT NULL DEFAULT current_timestamp(),
  `updated_at` timestamp NOT NULL DEFAULT current_timestamp() ON UPDATE current_timestamp()
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

--
-- Dumping data for table `doctor_leave_balance`
--

INSERT INTO `doctor_leave_balance` (`id`, `doctor_id`, `category_id`, `total_days`, `used_days`, `year`, `created_at`, `updated_at`) VALUES
(46, 15, 1, 29, 2, 2025, '2025-09-12 19:02:56', '2025-09-12 19:33:15'),
(47, 15, 4, 30, 0, 2025, '2025-09-12 19:03:45', '2025-09-12 19:04:50'),
(48, 15, 3, 30, 0, 2025, '2025-09-12 19:04:41', '2025-09-12 19:04:41'),
(49, 15, 2, 30, 0, 2025, '2025-09-12 19:05:01', '2025-09-12 19:05:01'),
(50, 15, 5, 20, 0, 2025, '2025-09-12 19:16:32', '2025-09-12 19:16:32'),
(51, 16, 1, 50, 0, 2025, '2025-09-14 18:28:04', '2025-09-14 18:28:04');

-- --------------------------------------------------------

--
-- Table structure for table `leave_applications`
--

CREATE TABLE `leave_applications` (
  `id` int(11) NOT NULL,
  `doctor_id` int(11) NOT NULL,
  `category_id` int(11) NOT NULL,
  `start_date` date NOT NULL,
  `end_date` date NOT NULL,
  `total_days` int(11) NOT NULL,
  `reason` text NOT NULL,
  `status` enum('pending','approved','rejected') DEFAULT 'pending',
  `admin_comment` text DEFAULT NULL,
  `applied_at` timestamp NOT NULL DEFAULT current_timestamp(),
  `reviewed_at` timestamp NULL DEFAULT NULL,
  `reviewed_by` int(11) DEFAULT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

--
-- Dumping data for table `leave_applications`
--

INSERT INTO `leave_applications` (`id`, `doctor_id`, `category_id`, `start_date`, `end_date`, `total_days`, `reason`, `status`, `admin_comment`, `applied_at`, `reviewed_at`, `reviewed_by`) VALUES
(5, 15, 1, '2025-09-13', '2025-09-17', 3, 'test the isskjjjjjjjjjjjjjj', 'rejected', 'out of the condition', '2025-09-12 19:19:40', '2025-09-12 19:33:26', 13),
(6, 15, 1, '2025-09-25', '2025-09-27', 2, 'testsssssssssssssssssssssssssssssssssssssssssssssssssssssssss', 'approved', 'Approved', '2025-09-12 19:31:24', '2025-09-12 19:33:15', 13),
(7, 15, 1, '2025-09-16', '2025-09-17', 2, 'hhhhhhhhhhhhhhhhhhhhhhhhhhhhhhhhhhhhhhhhhhhhhhhhhhhhhhhhhhhhhhhh', 'pending', NULL, '2025-09-16 11:43:06', NULL, NULL);

-- --------------------------------------------------------

--
-- Table structure for table `leave_categories`
--

CREATE TABLE `leave_categories` (
  `id` int(11) NOT NULL,
  `name` varchar(50) NOT NULL,
  `max_days` int(11) NOT NULL,
  `description` text DEFAULT NULL,
  `created_at` timestamp NOT NULL DEFAULT current_timestamp(),
  `is_active` tinyint(1) NOT NULL DEFAULT 1 COMMENT '1 for active, 0 for inactive'
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

--
-- Dumping data for table `leave_categories`
--

INSERT INTO `leave_categories` (`id`, `name`, `max_days`, `description`, `created_at`, `is_active`) VALUES
(1, 'Casual', 3, 'Casual leave for personal reasons', '2025-09-05 12:33:43', 1),
(2, 'Medical', 7, 'Medical leave for health issues', '2025-09-05 12:33:43', 1),
(3, 'Paid', 15, 'Paid leave for vacation', '2025-09-05 12:33:43', 0),
(4, 'One Shot', 20, '20day emergency leave One Shot', '2025-09-05 12:33:43', 1),
(5, 'Test', 20, 'Enjoy', '2025-09-12 19:16:07', 0);

-- --------------------------------------------------------

--
-- Table structure for table `users`
--

CREATE TABLE `users` (
  `id` int(11) NOT NULL,
  `name` varchar(100) NOT NULL,
  `email` varchar(100) NOT NULL,
  `password` varchar(255) NOT NULL,
  `role` enum('doctor','admin') NOT NULL DEFAULT 'doctor',
  `department` varchar(100) DEFAULT NULL,
  `phone` varchar(20) DEFAULT NULL,
  `employee_id` varchar(50) DEFAULT NULL,
  `profile_picture` varchar(255) DEFAULT NULL,
  `is_active` tinyint(1) NOT NULL DEFAULT 1 COMMENT '1 = Active, 0 = Inactive',
  `created_at` timestamp NOT NULL DEFAULT current_timestamp(),
  `updated_at` timestamp NOT NULL DEFAULT current_timestamp() ON UPDATE current_timestamp()
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

--
-- Dumping data for table `users`
--

INSERT INTO `users` (`id`, `name`, `email`, `password`, `role`, `department`, `phone`, `employee_id`, `profile_picture`, `is_active`, `created_at`, `updated_at`) VALUES
(13, 'Hospital Administrator', 'admin@hospital.com', '$2a$12$PkDrXUP/boIBRcdtee9IW.kCLgxFVp5zRbSG4xtzr6wdZ7ZeFqIpm', 'admin', 'Administration', '+1234567890', 'ADMIN001', '/uploads/profiles/13_1757909107128.jpg', 1, '2025-09-10 17:24:50', '2025-09-15 04:05:07'),
(15, 'Mithu', 'mithu@gmail.com', '$2a$12$mLfXV.ArfCyzxh0uWUL8c.yZjYkW/oZbiyWtqdOlF5j0.8ZO7xgpK', 'doctor', 'ENT', '9861500797', 'mithu12', '/uploads/profiles/15_1757699501913.jpg', 1, '2025-09-11 03:43:19', '2025-09-12 18:01:53'),
(16, 'Test Doctor', 'test@example.com', '$2a$12$F6AhciYaEGAK.ww9sznrwuItekIB4k/tN.aKtmifZ7eUQ3ZMJLKEi', 'doctor', 'Test Dept', NULL, 'test123', NULL, 0, '2025-09-14 16:56:14', '2025-09-15 04:03:39'),
(17, 'Ajit Kumar Behera', 'ajit@gmail.com', '$2a$12$Zps5B/d8pDHZO7WK5yKJ2u4nUiUAwOd0GdZcjrUeMYRxbN6f9gkFK', 'doctor', 'ENT', '9861500797', 'ajit12', NULL, 0, '2025-09-14 16:56:54', '2025-09-15 04:03:37');

--
-- Indexes for dumped tables
--

--
-- Indexes for table `doctor_leave_balance`
--
ALTER TABLE `doctor_leave_balance`
  ADD PRIMARY KEY (`id`),
  ADD UNIQUE KEY `unique_doctor_category_year` (`doctor_id`,`category_id`,`year`),
  ADD KEY `category_id` (`category_id`);

--
-- Indexes for table `leave_applications`
--
ALTER TABLE `leave_applications`
  ADD PRIMARY KEY (`id`),
  ADD KEY `category_id` (`category_id`),
  ADD KEY `reviewed_by` (`reviewed_by`),
  ADD KEY `idx_leave_applications_doctor` (`doctor_id`),
  ADD KEY `idx_leave_applications_status` (`status`),
  ADD KEY `idx_leave_applications_dates` (`start_date`,`end_date`);

--
-- Indexes for table `leave_categories`
--
ALTER TABLE `leave_categories`
  ADD PRIMARY KEY (`id`),
  ADD UNIQUE KEY `name` (`name`),
  ADD KEY `idx_leave_categories_is_active` (`is_active`),
  ADD KEY `idx_leave_categories_status_name` (`is_active`,`name`);

--
-- Indexes for table `users`
--
ALTER TABLE `users`
  ADD PRIMARY KEY (`id`),
  ADD UNIQUE KEY `email` (`email`),
  ADD UNIQUE KEY `employee_id` (`employee_id`),
  ADD KEY `idx_users_role` (`role`),
  ADD KEY `idx_users_email` (`email`),
  ADD KEY `idx_users_status` (`is_active`);

--
-- AUTO_INCREMENT for dumped tables
--

--
-- AUTO_INCREMENT for table `doctor_leave_balance`
--
ALTER TABLE `doctor_leave_balance`
  MODIFY `id` int(11) NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=52;

--
-- AUTO_INCREMENT for table `leave_applications`
--
ALTER TABLE `leave_applications`
  MODIFY `id` int(11) NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=8;

--
-- AUTO_INCREMENT for table `leave_categories`
--
ALTER TABLE `leave_categories`
  MODIFY `id` int(11) NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=6;

--
-- AUTO_INCREMENT for table `users`
--
ALTER TABLE `users`
  MODIFY `id` int(11) NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=18;

--
-- Constraints for dumped tables
--

--
-- Constraints for table `doctor_leave_balance`
--
ALTER TABLE `doctor_leave_balance`
  ADD CONSTRAINT `doctor_leave_balance_ibfk_1` FOREIGN KEY (`doctor_id`) REFERENCES `users` (`id`) ON DELETE CASCADE,
  ADD CONSTRAINT `doctor_leave_balance_ibfk_2` FOREIGN KEY (`category_id`) REFERENCES `leave_categories` (`id`);

--
-- Constraints for table `leave_applications`
--
ALTER TABLE `leave_applications`
  ADD CONSTRAINT `leave_applications_ibfk_1` FOREIGN KEY (`doctor_id`) REFERENCES `users` (`id`) ON DELETE CASCADE,
  ADD CONSTRAINT `leave_applications_ibfk_2` FOREIGN KEY (`category_id`) REFERENCES `leave_categories` (`id`),
  ADD CONSTRAINT `leave_applications_ibfk_3` FOREIGN KEY (`reviewed_by`) REFERENCES `users` (`id`);
COMMIT;

/*!40101 SET CHARACTER_SET_CLIENT=@OLD_CHARACTER_SET_CLIENT */;
/*!40101 SET CHARACTER_SET_RESULTS=@OLD_CHARACTER_SET_RESULTS */;
/*!40101 SET COLLATION_CONNECTION=@OLD_COLLATION_CONNECTION */;
