import { useQuery } from '@tanstack/react-query';
import { fetchAnalytics, analyticsSnapshot } from '../domain/analytics';

const ANALYTICS_QUERY_KEY = ['analytics'];

export const useAnalytics = () =>
  useQuery({
    queryKey: ANALYTICS_QUERY_KEY,
    queryFn: fetchAnalytics,
    initialData: analyticsSnapshot,
    staleTime: 1000 * 60 * 2,
  });
