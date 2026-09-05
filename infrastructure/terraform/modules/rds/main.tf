resource "aws_db_subnet_group" "rds" {
  name       = "${var.environment}-idp-db-subnet-group"
  subnet_ids = var.private_subnet_ids

  tags = var.tags
}

resource "aws_security_group" "rds_sg" {
  name        = "${var.environment}-idp-rds-sg"
  description = "Security group for Backstage RDS PostgreSQL database"
  vpc_id      = var.vpc_id

  ingress {
    from_port   = 5432
    to_port     = 5432
    protocol    = "tcp"
    cidr_blocks = ["10.0.0.0/16"]
  }

  egress {
    from_port   = 0
    to_port     = 0
    protocol    = "-1"
    cidr_blocks = ["0.0.0.0/0"]
  }

  tags = var.tags
}

resource "aws_db_instance" "postgres" {
  identifier             = "${var.environment}-idp-db"
  allocated_storage      = 20
  max_allocated_storage  = 50
  engine                 = "postgres"
  engine_version         = "15.4"
  instance_class         = var.db_instance_class
  db_name                = "backstage_catalog"
  username               = var.db_admin_user
  password               = var.db_admin_password
  db_subnet_group_name   = aws_db_subnet_group.rds.name
  vpc_security_group_ids = [aws_security_group.rds_sg.id]
  skip_final_snapshot    = var.environment == "dev" ? true : false

  tags = var.tags
}

variable "environment" { type = string }
variable "vpc_id" { type = string }
variable "private_subnet_ids" { type = list(string) }
variable "db_instance_class" { type = string; default = "db.t3.micro" }
variable "db_admin_user" { type = string; default = "idp_admin" }
variable "db_admin_password" { type = string; sensitive = true }
variable "tags" { type = map(string); default = {} }

output "db_endpoint" { value = aws_db_instance.postgres.endpoint }
output "db_host" { value = aws_db_instance.postgres.address }
output "db_port" { value = aws_db_instance.postgres.port }
