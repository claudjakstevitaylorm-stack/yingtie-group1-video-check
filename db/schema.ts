import {sqliteTable,text,integer,real,index} from 'drizzle-orm/sqlite-core';
export const uploads=sqliteTable('shared_uploads',{
 id:text('id').primaryKey(),member:text('member').notNull(),name:text('name').notNull(),
 kind:text('kind').notNull(),state:text('state').notNull(),size:integer('size').notNull(),
 mime:text('mime').notNull(),createdAt:text('created_at').notNull(),updatedAt:text('updated_at').notNull(),
 ownerHash:text('owner_hash').notNull(),videoReady:integer('video_ready').notNull().default(0),
 status:text('status'),score:real('score'),duration:real('duration'),report:text('report'),error:text('error'),
},(t)=>[index('shared_uploads_date_idx').on(t.createdAt,t.id),index('shared_uploads_owner_idx').on(t.ownerHash,t.createdAt)]);
export const templates=sqliteTable('shared_templates',{
 id:text('id').primaryKey(),sha:text('sha').notNull().unique(),name:text('name').notNull(),
 member:text('member').notNull(),enabled:integer('enabled').notNull().default(1),
 createdAt:text('created_at').notNull(),feature:text('feature').notNull(),ownerHash:text('owner_hash').notNull(),
});
