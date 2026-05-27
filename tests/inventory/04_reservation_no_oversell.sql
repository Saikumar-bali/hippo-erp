-- Reservation no-oversell test plan
-- reserve within available -> pass; reserve above available -> exception
do $$ begin raise notice 'Reservation oversell guard test template ready'; end $$;
