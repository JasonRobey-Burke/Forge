BEGIN TRY

BEGIN TRAN;

-- CreateTable
CREATE TABLE [dbo].[products] (
    [id] NVARCHAR(1000) NOT NULL,
    [name] NVARCHAR(255) NOT NULL,
    [problem_statement] NVARCHAR(max) NOT NULL,
    [vision] NVARCHAR(max) NOT NULL,
    [target_audience] NVARCHAR(max) NOT NULL,
    [status] NVARCHAR(50) NOT NULL CONSTRAINT [products_status_df] DEFAULT 'Discovery',
    [context] NVARCHAR(max) NOT NULL,
    [wip_limits] NVARCHAR(max) NOT NULL,
    [created_at] DATETIME2 NOT NULL CONSTRAINT [products_created_at_df] DEFAULT CURRENT_TIMESTAMP,
    [updated_at] DATETIME2 NOT NULL,
    [archived_at] DATETIME2,
    CONSTRAINT [products_pkey] PRIMARY KEY CLUSTERED ([id])
);

-- CreateTable
CREATE TABLE [dbo].[intentions] (
    [id] NVARCHAR(1000) NOT NULL,
    [product_id] NVARCHAR(1000) NOT NULL,
    [title] NVARCHAR(255) NOT NULL,
    [description] NVARCHAR(max) NOT NULL,
    [priority] NVARCHAR(50) NOT NULL CONSTRAINT [intentions_priority_df] DEFAULT 'Medium',
    [status] NVARCHAR(50) NOT NULL CONSTRAINT [intentions_status_df] DEFAULT 'Draft',
    [created_at] DATETIME2 NOT NULL CONSTRAINT [intentions_created_at_df] DEFAULT CURRENT_TIMESTAMP,
    [updated_at] DATETIME2 NOT NULL,
    [archived_at] DATETIME2,
    CONSTRAINT [intentions_pkey] PRIMARY KEY CLUSTERED ([id])
);

-- CreateTable
CREATE TABLE [dbo].[intention_dependencies] (
    [intention_id] NVARCHAR(1000) NOT NULL,
    [depends_on_id] NVARCHAR(1000) NOT NULL,
    CONSTRAINT [intention_dependencies_pkey] PRIMARY KEY CLUSTERED ([intention_id],[depends_on_id])
);

-- CreateTable
CREATE TABLE [dbo].[expectations] (
    [id] NVARCHAR(1000) NOT NULL,
    [intention_id] NVARCHAR(1000) NOT NULL,
    [title] NVARCHAR(255) NOT NULL,
    [description] NVARCHAR(max) NOT NULL,
    [status] NVARCHAR(50) NOT NULL CONSTRAINT [expectations_status_df] DEFAULT 'Draft',
    [edge_cases] NVARCHAR(max) NOT NULL,
    [created_at] DATETIME2 NOT NULL CONSTRAINT [expectations_created_at_df] DEFAULT CURRENT_TIMESTAMP,
    [updated_at] DATETIME2 NOT NULL,
    [archived_at] DATETIME2,
    CONSTRAINT [expectations_pkey] PRIMARY KEY CLUSTERED ([id])
);

-- CreateTable
CREATE TABLE [dbo].[specs] (
    [id] NVARCHAR(1000) NOT NULL,
    [product_id] NVARCHAR(1000) NOT NULL,
    [title] NVARCHAR(255) NOT NULL,
    [description] NVARCHAR(max) NOT NULL,
    [phase] NVARCHAR(50) NOT NULL CONSTRAINT [specs_phase_df] DEFAULT 'Draft',
    [complexity] NVARCHAR(50) NOT NULL CONSTRAINT [specs_complexity_df] DEFAULT 'Medium',
    [context] NVARCHAR(max) NOT NULL,
    [boundaries] NVARCHAR(max) NOT NULL,
    [deliverables] NVARCHAR(max) NOT NULL,
    [validation_automated] NVARCHAR(max) NOT NULL,
    [validation_human] NVARCHAR(max) NOT NULL,
    [peer_reviewed] BIT NOT NULL CONSTRAINT [specs_peer_reviewed_df] DEFAULT 0,
    [created_at] DATETIME2 NOT NULL CONSTRAINT [specs_created_at_df] DEFAULT CURRENT_TIMESTAMP,
    [updated_at] DATETIME2 NOT NULL,
    [archived_at] DATETIME2,
    CONSTRAINT [specs_pkey] PRIMARY KEY CLUSTERED ([id])
);

-- CreateTable
CREATE TABLE [dbo].[spec_expectations] (
    [spec_id] NVARCHAR(1000) NOT NULL,
    [expectation_id] NVARCHAR(1000) NOT NULL,
    CONSTRAINT [spec_expectations_pkey] PRIMARY KEY CLUSTERED ([spec_id],[expectation_id])
);

-- CreateTable
CREATE TABLE [dbo].[phase_transitions] (
    [id] NVARCHAR(1000) NOT NULL,
    [spec_id] NVARCHAR(1000) NOT NULL,
    [from_phase] NVARCHAR(50) NOT NULL,
    [to_phase] NVARCHAR(50) NOT NULL,
    [timestamp] DATETIME2 NOT NULL CONSTRAINT [phase_transitions_timestamp_df] DEFAULT CURRENT_TIMESTAMP,
    [user_id] NVARCHAR(255) NOT NULL,
    [override_reason] NVARCHAR(max),
    CONSTRAINT [phase_transitions_pkey] PRIMARY KEY CLUSTERED ([id])
);

-- AddForeignKey
ALTER TABLE [dbo].[intentions] ADD CONSTRAINT [intentions_product_id_fkey] FOREIGN KEY ([product_id]) REFERENCES [dbo].[products]([id]) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE [dbo].[intention_dependencies] ADD CONSTRAINT [intention_dependencies_intention_id_fkey] FOREIGN KEY ([intention_id]) REFERENCES [dbo].[intentions]([id]) ON DELETE NO ACTION ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE [dbo].[intention_dependencies] ADD CONSTRAINT [intention_dependencies_depends_on_id_fkey] FOREIGN KEY ([depends_on_id]) REFERENCES [dbo].[intentions]([id]) ON DELETE NO ACTION ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE [dbo].[expectations] ADD CONSTRAINT [expectations_intention_id_fkey] FOREIGN KEY ([intention_id]) REFERENCES [dbo].[intentions]([id]) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE [dbo].[specs] ADD CONSTRAINT [specs_product_id_fkey] FOREIGN KEY ([product_id]) REFERENCES [dbo].[products]([id]) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE [dbo].[spec_expectations] ADD CONSTRAINT [spec_expectations_spec_id_fkey] FOREIGN KEY ([spec_id]) REFERENCES [dbo].[specs]([id]) ON DELETE NO ACTION ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE [dbo].[spec_expectations] ADD CONSTRAINT [spec_expectations_expectation_id_fkey] FOREIGN KEY ([expectation_id]) REFERENCES [dbo].[expectations]([id]) ON DELETE NO ACTION ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE [dbo].[phase_transitions] ADD CONSTRAINT [phase_transitions_spec_id_fkey] FOREIGN KEY ([spec_id]) REFERENCES [dbo].[specs]([id]) ON DELETE CASCADE ON UPDATE CASCADE;

COMMIT TRAN;

END TRY
BEGIN CATCH

IF @@TRANCOUNT > 0
BEGIN
    ROLLBACK TRAN;
END;
THROW

END CATCH
