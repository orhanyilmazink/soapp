export type LegacyCategoryId = 'together' | 'books' | 'events' | 'learn'

export type ActiveCategoryId =
  | 'places'
  | 'games'
  | 'series'
  | 'movies'
  | 'food'
export type CategoryId = ActiveCategoryId | LegacyCategoryId

export type Category = {
  id: ActiveCategoryId
  label: string
  items: { id: string; text: string }[]
}

export const categories: Category[] = [
  { id: 'places', label: 'Gezilecek Yerler', items: [] },
  { id: 'games', label: 'Oynanacak Oyunlar', items: [] },
  { id: 'series', label: 'İzlenecek Diziler', items: [] },
  { id: 'movies', label: 'İzlenecek Filmler', items: [] },
  { id: 'food', label: 'Denenecek Lezzetler', items: [] },
]
