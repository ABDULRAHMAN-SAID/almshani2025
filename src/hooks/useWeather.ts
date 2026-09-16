import { useQuery } from "@tanstack/react-query";
import { PLACES, placeLabel } from "@/constants/places";
import { currentCoords, type Coords, type LocationOutcome } from "@/services/locationService";
import { fetchForecast } from "@/services/weatherService";
import { useWeatherStore } from "@/store/weatherStore";

/**
 * الطقس حيث أنت.
 *
 * خطوتان لا واحدة: أين أنت، ثم ما طقس ذلك المكان. وفصلهما مقصود — فشل تحديد
 * الموقع ليس فشل الطقس، ولكلٍّ رسالته وعلاجه. ولو جُمعا لقيل «تعذّر جلب
 * الطقس» لمن أطفأ خدمة الموقع، فيظلّ يبحث عن العطل في الشبكة.
 */

export type WeatherPlace =
  | { status: "ok"; coords: Coords; label: string; manual: boolean }
  | { status: "denied" }
  | { status: "off" }
  | { status: "unavailable" }
  | { status: "error"; message: string };

async function resolvePlace(manualKey: string | null): Promise<WeatherPlace> {
  if (manualKey) {
    const place = PLACES.find((item) => item.key === manualKey);
    if (place) {
      return {
        status: "ok",
        coords: { lat: place.lat, lon: place.lon },
        label: place.name,
        manual: true,
      };
    }
  }
  const outcome: LocationOutcome = await currentCoords();
  if (outcome.status !== "ok") return outcome;
  return {
    status: "ok",
    coords: outcome.coords,
    label: placeLabel(outcome.coords.lat, outcome.coords.lon),
    manual: false,
  };
}

export function useWeatherPlace() {
  const manualKey = useWeatherStore((state) => state.manualPlace);
  return useQuery({
    queryKey: ["weather-place", manualKey],
    queryFn: () => resolvePlace(manualKey),
    // لا يُعاد السؤال عن الموقع كل ثانية: قراءة الموقع تُشغّل عتاد الجهاز.
    // وخمس دقائق كافية لمن انتقل بالسيارة، وقليلة على البطارية.
    staleTime: 5 * 60_000,
    retry: false,
  });
}

export function useForecast(coords: Coords | null) {
  // المفتاح بمنزلتين عشريتين — نحو كيلومتر: من تحرّك خطواتٍ لا يُعيد الطلب،
  // ومن انتقل إلى مدينة أخرى يُعيده.
  const key = coords ? `${coords.lat.toFixed(2)},${coords.lon.toFixed(2)}` : "none";
  return useQuery({
    queryKey: ["forecast", key],
    queryFn: () => fetchForecast(coords!.lat, coords!.lon),
    enabled: Boolean(coords),
    staleTime: 10 * 60_000,
    refetchInterval: 15 * 60_000,
    retry: 1,
  });
}

/** الاثنان معًا — لمن يريد سطرًا واحدًا في الشاشة الرئيسية. */
export function useWeather() {
  const place = useWeatherPlace();
  const coords = place.data?.status === "ok" ? place.data.coords : null;
  const forecast = useForecast(coords);
  return {
    place,
    forecast,
    label: place.data?.status === "ok" ? place.data.label : "",
    loading: place.isLoading || (Boolean(coords) && forecast.isLoading),
    refresh: async () => {
      const next = await place.refetch();
      if (next.data?.status === "ok") await forecast.refetch();
    },
  };
}
