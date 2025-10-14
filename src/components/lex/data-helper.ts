import { pbdbDomain } from "@macrostrat-web/settings";

export async function getPrevalentTaxa(fossilsData) {
    // Extract cltn IDs to fetch taxa data (PBDB)
    const collectionIds = fossilsData?.features
    ?.map((feature) => feature.properties.cltn_id)

    let taxaData = null;
    if (collectionIds && collectionIds.length > 0) {
    try {
        const response = await fetch(
        `${pbdbDomain}/data1.2/occs/prevalence.json?limit=5&coll_id=${collectionIds.join(",")}`
        );
        if (response.ok) {
        taxaData = await response.json();
        } else {
        console.warn("PBDB taxa fetch failed with status", response.status);
        }
    } catch (err) {
        console.warn("Error fetching taxa data from PBDB:", err);
    }
    }
    return taxaData;
}