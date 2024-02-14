import { useEffect, useRef, useState } from "react";
import { PostgrestQueryBuilder } from "@supabase/postgrest-js";

function useDebouncedFetch(url: string, delay: number) {
  const [data, setData] = useState(null);
  const [error, setError] = useState(null);
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    let timerId: any;
    const controller = new AbortController();

    const fetchData = async () => {
      setIsLoading(true);
      try {
        const response = await fetch(url, { signal: controller.signal });
        if (!response.ok) {
          throw new Error(`HTTP error! status: ${response.status}`);
        }
        const data = await response.json();
        setData(data);
      } catch (error) {
        if (error.name === "AbortError") {
          console.log("Fetch cancelled");
        } else {
          setError(error);
        }
      } finally {
        setIsLoading(false);
      }
    };

    timerId = setTimeout(fetchData, delay);

    return () => {
      clearTimeout(timerId);
      controller.abort();
    };
  }, [url, delay]);

  return { data, error, isLoading };
}

export { useDebouncedFetch };
