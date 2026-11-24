create table profiles (id uuid primary key, email text, full_name text, role text default 'user');
create table transactions (id uuid primary key, user_id uuid references profiles(id), amount numeric, recipient text);

alter table profiles enable row level security;
create policy "profiles readable" on profiles for select using (true);
