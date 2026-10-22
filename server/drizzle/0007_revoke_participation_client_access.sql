REVOKE ALL PRIVILEGES ON TABLE
  public.community_memberships,
  public.community_membership_transitions,
  public.event_registrations,
  public.event_registration_transitions
FROM PUBLIC, anon, authenticated;
