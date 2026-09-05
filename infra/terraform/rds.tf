# Random Password Generation for Master DB User (if not explicitly provided)
resource "random_password" "db_password" {
  count   = var.create_rds && var.db_password == "" ? 1 : 0
  length  = 24
  special = false
}

locals {
  database_password = var.db_password != "" ? var.db_password : (length(random_password.db_password) > 0 ? random_password.db_password[0].result : "DefaultDevDbSecret123!")
}

# DB Subnet Group (Private Subnets across 2 AZs — No Public Exposure)
resource "aws_db_subnet_group" "rds" {
  count       = var.create_rds ? 1 : 0
  name        = "forgeops-${var.environment}-db-subnet-group"
  description = "Private database subnet group for ForgeOps PostgreSQL RDS"
  subnet_ids  = aws_subnet.private[*].id

  tags = merge(var.tags, {
    Name = "forgeops-${var.environment}-db-subnet-group"
  })
}

# Security Group for RDS PostgreSQL
resource "aws_security_group" "rds" {
  count       = var.create_rds ? 1 : 0
  name        = "forgeops-${var.environment}-rds-sg"
  description = "Strict inbound access to PostgreSQL only from EKS worker node security group"
  vpc_id      = aws_vpc.main.id

  # Allow inbound PostgreSQL connections strictly from EKS Node Security Group
  ingress {
    description     = "PostgreSQL from EKS worker nodes"
    from_port       = 5432
    to_port         = 5432
    protocol        = "tcp"
    security_groups = [aws_security_group.node.id]
  }

  egress {
    description = "Allow outbound response traffic"
    from_port   = 0
    to_port     = 0
    protocol    = "-1"
    cidr_blocks = ["0.0.0.0/0"]
  }

  tags = merge(var.tags, {
    Name = "forgeops-${var.environment}-rds-sg"
  })
}

# RDS PostgreSQL Database Instance
resource "aws_db_instance" "postgres" {
  count                  = var.create_rds ? 1 : 0
  identifier             = "forgeops-${var.environment}-postgres"
  engine                 = "postgres"
  engine_version         = "15.7"
  instance_class         = var.db_instance_class
  allocated_storage      = var.db_allocated_storage
  max_allocated_storage  = var.db_max_allocated_storage
  storage_type           = "gp3"
  storage_encrypted      = true
  publicly_accessible    = false
  db_name                = var.db_name
  username               = var.db_username
  password               = local.database_password
  db_subnet_group_name   = aws_db_subnet_group.rds[0].name
  vpc_security_group_ids = [aws_security_group.rds[0].id]

  backup_retention_period    = var.environment == "prod" ? 14 : 7
  backup_window              = "03:00-04:00"
  maintenance_window         = "Mon:04:00-Mon:05:00"
  auto_minor_version_upgrade = true
  skip_final_snapshot        = var.environment != "prod"
  deletion_protection        = var.environment == "prod"

  tags = merge(var.tags, {
    Name        = "forgeops-${var.environment}-postgres"
    Component   = "Catalog-Database"
    Environment = var.environment
  })
}

# Store Database Credentials in AWS Secrets Manager
resource "aws_secretsmanager_secret" "db_credentials" {
  count       = var.create_rds ? 1 : 0
  name        = "forgeops/${var.environment}/rds/credentials"
  description = "Connection credentials for ForgeOps Backstage catalog PostgreSQL database"

  recovery_window_in_days = 0 # Immediate deletion on destroy for dev environments

  tags = merge(var.tags, {
    Name        = "forgeops-${var.environment}-rds-credentials"
    Environment = var.environment
  })
}

resource "aws_secretsmanager_secret_version" "db_credentials" {
  count     = var.create_rds ? 1 : 0
  secret_id = aws_secretsmanager_secret.db_credentials[0].id
  secret_string = jsonencode({
    host     = aws_db_instance.postgres[0].address
    port     = aws_db_instance.postgres[0].port
    database = aws_db_instance.postgres[0].db_name
    username = aws_db_instance.postgres[0].username
    password = local.database_password
  })
}
