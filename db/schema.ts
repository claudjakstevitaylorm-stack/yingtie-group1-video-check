import {sqliteTable,text,integer,real,index} from 'drizzle-orm/sqlite-core';
export const uploads=sqliteTable('shared_uploads',{
 team:text('team').notNull().default('1'),id:text('id').primaryKey(),member:text('member').notNull(),name:text('name').notNull(),
 category:text('category').notNull().default('未分类'),templateId:text('template_id'),templateName:text('template_name').notNull().default(''),templateSnapshot:text('template_snapshot'),
 kind:text('kind').notNull(),state:text('state').notNull(),size:integer('size').notNull(),
 mime:text('mime').notNull(),createdAt:text('created_at').notNull(),updatedAt:text('updated_at').notNull(),
 ownerHash:text('owner_hash').notNull(),videoReady:integer('video_ready').notNull().default(0),
 status:text('status'),score:real('score'),duration:real('duration'),report:text('report'),error:text('error'),
},(t)=>[index('shared_uploads_team_date_idx').on(t.team,t.createdAt,t.id),index('shared_uploads_date_idx').on(t.createdAt,t.id),index('shared_uploads_owner_idx').on(t.ownerHash,t.createdAt)]);
export const templates=sqliteTable('shared_templates',{
 team:text('team').notNull().default('1'),id:text('id').primaryKey(),sha:text('sha').notNull(),name:text('name').notNull(),
 category:text('category').notNull().default('未分类'),
 member:text('member').notNull(),enabled:integer('enabled').notNull().default(1),
 createdAt:text('created_at').notNull(),feature:text('feature').notNull(),ownerHash:text('owner_hash').notNull(),
});

export const memberships=sqliteTable('group_memberships',{
 ownerHash:text('owner_hash').primaryKey(),member:text('member').notNull(),homeTeam:text('home_team').notNull(),mediaToken:text('media_token').notNull(),
},t=>[index('group_memberships_media_idx').on(t.mediaToken)]);
