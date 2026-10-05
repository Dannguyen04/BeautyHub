-- Scheduled work has no public/browser entry point. Run as postgres only.
alter table public.bookings add column reminded_at timestamptz;
create index notifications_inbox on public.notifications(user_id,created_at desc);
create index booking_events_timeline on public.booking_events(booking_id,created_at);
create index support_queue on public.support_requests(status,created_at);
create index analytics_actor_time on public.analytics_events(actor_id,created_at);

create function private.maintenance() returns void language plpgsql security definer set search_path='' as $$
declare p record; b record;
begin
 if not pg_try_advisory_xact_lock(78231005) then return; end if;
 for p in select distinct provider_id from public.bookings where status in ('REQUESTED','AWAITING_DEPOSIT') and hold_until<now() loop
  perform private.expire_holds(p.provider_id);
 end loop;
 for b in update public.bookings set reminded_at=now() where status='CONFIRMED' and reminded_at is null and starts_at>now() and starts_at<=now()+interval '24 hours' returning id loop
  perform private.event(b.id,'UPCOMING','Buổi hẹn sẽ diễn ra trong 24 giờ tới. Vui lòng kiểm tra giờ và địa điểm.');
 end loop;
 -- Retain only anonymous-free funnel events for a bounded 90-day beta window.
 delete from public.analytics_events where created_at<now()-interval '90 days';
end $$;
revoke execute on function private.maintenance() from public,anon,authenticated;

create function public.provider_stats() returns table(provider_id uuid,completed_count bigint) language sql stable security definer set search_path='' as $$
 select p.id,count(b.id) from public.providers p left join public.bookings b on b.provider_id=p.id and b.status='COMPLETED'
 where p.status='APPROVED' group by p.id;
$$;
grant execute on function public.provider_stats() to anon,authenticated;

-- No search terms, URLs, contact details or third-party SDK are recorded.
-- These counts cover signed-in users only, not all website visitors.
create function public.track_event(p_event text) returns void language plpgsql security definer set search_path='' as $$
begin
 if auth.uid() is null then return; end if;
 if p_event not in ('search','provider_view','package_view','booking_started','booking_submitted') then raise exception 'Unknown event'; end if;
 perform pg_advisory_xact_lock(hashtextextended(auth.uid()::text,1));
 if (select count(*) from public.analytics_events where actor_id=auth.uid() and created_at>now()-interval '1 day')>=100 then return; end if;
 if exists(select 1 from public.analytics_events where actor_id=auth.uid() and event=p_event and created_at>now()-interval '10 seconds') then return; end if;
 insert into public.analytics_events(actor_id,event) values(auth.uid(),p_event);
end $$;
grant execute on function public.track_event(text) to authenticated;

create function public.admin_metrics() returns jsonb language plpgsql stable security definer set search_path='' as $$
begin
 if not public.is_admin() then raise exception 'Không có quyền.'; end if;
 return jsonb_build_object(
 'users',(select count(*) from public.profiles),
 'active_providers',(select count(*) from public.providers where status='APPROVED'),
 'requests',(select count(*) from public.bookings),
 'paid',(select count(*) from public.bookings where payment_status='PAID'),
 'completed',(select count(*) from public.bookings where status='COMPLETED'),
 'gmv',(select coalesce(sum(price),0) from public.bookings where status='COMPLETED'),
 'cancellation_rate',(select coalesce(round(100.0*count(*) filter(where status='CANCELLED')/nullif(count(*),0),1),0) from public.bookings),
 'funnel',(select coalesce(jsonb_object_agg(event,n),'{}') from (select event,count(*) n from public.analytics_events where created_at>now()-interval '90 days' group by event) x));
end $$;
grant execute on function public.admin_metrics() to authenticated;
