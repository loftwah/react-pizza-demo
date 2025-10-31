import { useQuery } from '@tanstack/react-query'
import { fetchMenu, menu } from '../domain/menu'

const MENU_QUERY_KEY = ['menu']

export const useMenu = () =>
  useQuery({
    queryKey: MENU_QUERY_KEY,
    queryFn: fetchMenu,
    initialData: menu,
    staleTime: 1000 * 60 * 5,
  })
