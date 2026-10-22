alter table public.people drop constraint if exists people_tier_check;

alter table public.people add constraint people_tier_check
  check (tier in ('soul', 'close', 'friend', 'acquaintance', 'weak'));
