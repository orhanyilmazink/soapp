export type CategoryId =
  | 'places'
  | 'games'
  | 'series'
  | 'movies'
  | 'food'
  | 'together'
  | 'books'
  | 'events'
  | 'learn'

export type Category = {
  id: CategoryId
  label: string
  items: { id: string; text: string }[]
}

const list = (prefix: string, texts: string[]) =>
  texts.map((text, i) => ({ id: `${prefix}-${i + 1}`, text }))

export const categories: Category[] = [
  { id: 'places', label: 'Gezilecek Yerler', items: [] },
  { id: 'games', label: 'Oynanacak Oyunlar', items: [] },
  { id: 'series', label: 'İzlenecek Diziler', items: [] },
  { id: 'movies', label: 'İzlenecek Filmler', items: [] },
  { id: 'food', label: 'Denenecek Lezzetler', items: [] },
  { id: 'together', label: 'Birlikte Yapılacaklar', items: [] },
  { id: 'books', label: 'Okunacak Kitaplar', items: [] },
  { id: 'events', label: 'Konser & Etkinlik', items: [] },
  { id: 'learn', label: 'Öğrenilecekler', items: [] },
]
