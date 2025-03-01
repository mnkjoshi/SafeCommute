import axios from 'axios';

export default async function Search(query) {
    try {
        const response = await axios({
            method: 'get',
            url: 'https://api.themoviedb.org/3/search/multi?query=' + query + '&api_key=' + process.env.TMDB_Credentials,
        });

        let List = response.data["results"];
        List = List.filter(item => item["media_type"] === "tv" || item["media_type"] === "movie" && !(item["poster_path"] == null) && !(item["poster_path"] == "null"));

        return JSON.stringify(List);
    } catch (error) {
        console.error("Error fetching data:", error);
        return null;
    }
}
