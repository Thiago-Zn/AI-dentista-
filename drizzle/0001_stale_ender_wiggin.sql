CREATE TABLE `consultationTemplates` (
	`id` int AUTO_INCREMENT NOT NULL,
	`dentistId` int,
	`name` varchar(255) NOT NULL,
	`description` text,
	`icon` varchar(50),
	`color` varchar(50),
	`promptCustomization` text,
	`isDefault` boolean NOT NULL DEFAULT false,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `consultationTemplates_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `consultations` (
	`id` int AUTO_INCREMENT NOT NULL,
	`dentistId` int NOT NULL,
	`patientId` int NOT NULL,
	`patientName` varchar(255) NOT NULL,
	`audioUrl` text,
	`audioFileKey` text,
	`audioDurationSeconds` int,
	`transcript` text,
	`soapNote` json,
	`templateUsed` varchar(50),
	`status` enum('draft','finalized','exported') NOT NULL DEFAULT 'draft',
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	`finalizedAt` timestamp,
	CONSTRAINT `consultations_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `patients` (
	`id` int AUTO_INCREMENT NOT NULL,
	`dentistId` int NOT NULL,
	`name` varchar(255) NOT NULL,
	`birthDate` varchar(10),
	`medicalHistory` text,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `patients_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
ALTER TABLE `users` ADD `croNumber` varchar(50);