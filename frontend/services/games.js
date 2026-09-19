import getFlag from "../lib/getFlag";
import request, {getBaseUrl, getBaseUrl2, getFullUrl} from "../lib/request"
import {itemNameToEncodedName} from "./catalog";

const gamePage2015Enabled = getFlag('2015GameDetailsPageEnabled', false);
const csrEnabled = getFlag('clientSideRenderingEnabled', false);

export const isLibraryItem = ({ assetTypeId }) => {
    switch (assetTypeId) {
        case 62:
        case 40:
        case 38:
        case 24:
        case 21:
        case 13:
        case 10:
        case 5:
        case 4:
        case 3:
        case 1:
            return true;
        default:
            return false;
    }
}

export const getGameUrl = ({placeId, name}) => {
    return `/games/${placeId}/${itemNameToEncodedName(name)}`;
}

export const getLibraryItemUrl = ({assetId, name}) => {
    return `/library/${assetId}/${itemNameToEncodedName(name)}`;
}

export const getGamePassCreationUrl = ({ universeId }) => {
    return `/develop?View=34&universeId=${universeId}`;
}

/**
 *
 * @param userId
 * @param cursor
 * @returns {Promise<UserGameEntry[]>}
 */
export const getUserGames = ({userId, cursor}) => {
    return request('GET', getFullUrl('games', `/v2/users/${userId}/games?limit=25&cursor=${encodeURIComponent(cursor || '')}`)).then(d => d.data);
}

export const getGroupGames = ({groupId, cursor}) => {
    return request('GET', getFullUrl('games', `/v2/groups/${groupId}/games?limit=25&cursor=${encodeURIComponent(cursor || '')}`)).then(d => d.data);
}

export const getGameSorts = ({gameSortsContext}) => {
    return request('GET', getFullUrl('games', `/v1/games/sorts?gameSortsContext=${encodeURIComponent(gameSortsContext || '')}`)).then(d => d.data)
}

export const getRecommendedGames = ({placeId, limit}) => {
    return request('GET', getFullUrl('games', `/v1/games/recommendations/game/${placeId}?maxRows=${limit}`)).then(d => d.data)
}

export const getGameList = ({sortToken, limit, genre = 0, keyword}) => {
    return request('GET', getFullUrl('games', `/v1/games/list?sortToken=${encodeURIComponent(sortToken)}&maxRows=${limit}&genre=${genre}&keyword=${keyword}`)).then(d => d.data)
}

export const getGameMedia = ({universeId}) => {
    return request('GET', getFullUrl('games', `/v2/games/${universeId}/media`)).then(d => d.data.data);
}

export const launchGame = async ({placeId}) => {
    const result = await request('GET', getBaseUrl() + '/game/get-join-script?placeId=' + encodeURIComponent(placeId));
    const toClick = result.data.joinUrl;
    const aTag = document.createElement('a');
    aTag.setAttribute('href', result.data.prefix + '' + result.data.joinScriptUrl);
    document.body.appendChild(aTag);
    aTag.click();

    setTimeout(() => {
        aTag.remove();
    }, 1000);
}

export const launchGameFromJobId = async ({placeId, jobId}) => {
    
    if (navigator.userAgent.includes("ROBLOX Android App") || navigator.userAgent.includes("ROBLOX iOS App")) {
        window.location.href = 'games/start?placeid=' + placeId;
        return;
    }
    
    const result = await request('GET', getBaseUrl() + '/game/get-join-script-fromjobid?placeId=' + encodeURIComponent(placeId) + "&jobId=" + encodeURIComponent(jobId));
    const toClick = result.data.joinUrl;
    const aTag = document.createElement('a');
    aTag.setAttribute('href', result.data.prefix + '' + result.data.joinScriptUrl);
    document.body.appendChild(aTag);
    aTag.click();

    setTimeout(() => {
        aTag.remove();
    }, 1000);
}

/*
 * FIX:
 * Не отправляем запрос, если placeIds пустой.
 */
export const multiGetPlaceDetails = ({ placeIds }) => {
    if (!Array.isArray(placeIds) || placeIds.length === 0) {
        return Promise.resolve([]);
    }

    return request(
        'GET',
        getFullUrl(
            'games',
            `/v1/games/multiget-place-details?placeIds=${encodeURIComponent(placeIds.join(','))}`
        )
    ).then(d => d.data);
}

export const multiGetUniverseDetails = ({universeIds}) => {
    if (!Array.isArray(universeIds) || universeIds.length === 0) {
        return Promise.resolve([]);
    }

    return request(
        'GET',
        getFullUrl(
            'games',
            `/v1/games?universeIds=${encodeURIComponent(universeIds.join(','))}`
        )
    ).then(d => d.data.data);
}

export const getServers = ({placeId, offset}) => {
    return request('GET', getBaseUrl() + `/games/getgameinstancesjson?placeId=${placeId}&startIndex=${offset}`).then(d => d.data);
}

export const multiGetGameVotes = ({universeIds}) => {
    if (!Array.isArray(universeIds) || universeIds.length === 0) {
        return Promise.resolve([]);
    }

    return request(
        'GET',
        getFullUrl(
            'games',
            '/v1/games/votes?universeIds=' + encodeURIComponent(universeIds.join(','))
        )
    ).then(d => d.data.data);
}

export const voteOnGame = ({universeId, isUpvote}) => {
    return request('PATCH', getFullUrl('games', '/v1/games/' + universeId + '/user-votes'), {
        vote: isUpvote,
    }).then(d => d.data.data);
}

export const shutdownPlaceServers = ({placeId}) => {
    return request('GET', getBaseUrl() + `/rcc/killallservers?placeId=${placeId}`).then(d => d.data);
}

export const shutdownSpecificServer = ({placeId, jobId}) => {
    return request('GET', getBaseUrl() + `/rcc/killserver?placeId=${placeId}&jobId=${jobId}`).then(d => d.data);
}

/**
 * @param {number} assetId
 * @returns {Promise<number|null>}
 */
export const getGamePassUniverse = ({ assetId }) => {
    return request('GET', getFullUrl('games', `/v1/games/game-passes/${assetId}`)).then(d => d?.data?.universeId);
}

/**
 * @param {number} assetId
 * @returns {Promise<{ id: number; name: string; }|null>}
 */
export const getGamePassRootPlace = ({ assetId }) => {
    return getGamePassUniverse({ assetId }).then(async universeId => {
        if (universeId) {
            return await getUniversePlaces({universeId: universeId}).then(d => {
                if (!d || !d.RootPlace || d.Places.length <= 0) return null;

                let place = d.Places.find(v => v.PlaceId === d.RootPlace);

                return place ? {
                    id: place.PlaceId,
                    name: place.Name
                } : null;
            });
        }

        return null;
    });
}

/**
 * @param {number} universeId
 * @returns {Promise<{ RootPlace: number; Places: { PlaceId: number; Name: string; }[]; }>}
 */
export const getUniversePlaces = ({ universeId }) => {
    return request('GET', getBaseUrl2(`/universes/get-universe-places?universeId=${universeId}`)).then(d => d.data);
}

/**
 *
 * @param {{ universeId: number; unfiltered?: boolean; }} props
 * @returns {Promise<GamepassEntry[]>}
 */
export const getUniverseGamePasses = ({ universeId, unfiltered = false }) => {
    return request('GET', getFullUrl('games', `/v1/games/${universeId}/game-passes${unfiltered ? "?unfiltered=1" : ""}`)).then(d => d.data.data);
}

/**
 * @param {{userId: number;}} props
 * @returns {Promise<number>}
 */
export const getUserCreatedPlaceCount = ({ userId }) => {
    return request("GET", getFullUrl("games", `/v1/users/${userId}/count`)).then(res => {
        if (!res.data?.universeCount) {
            console.log(`Could not get user ${userId}'s place count.`);
            return 0;
        }

        return res.data.universeCount;
    })
}

export const getGameTemplates = async () => {
    const req = await request("GET", getBaseUrl2("/v1/gametemplates"));
    return req.data.data;
}

/**
 *
 * @param templatePlaceId {number|null}
 * @returns {Promise<CreateGameResponse|string|null>}
 */
export const createGameRequest = ({ templatePlaceId = null }) => {
    return request('POST', getBaseUrl2(`/universes/create`), {
        templatePlaceIdToUse: templatePlaceId ?? 0,
    }, true).then(response => {
        console.log(response.data);

        if (response.data?.errors?.length > 0) {
            return response.data.errors[0].message;
        }

        if (!response.data?.placeId || !response.data?.universeId) {
            console.error("Could not create place using Template Id " + templatePlaceId);
            return null;
        }

        return {
            placeId: response.data.placeId,
            universeId: response.data.universeId,
        };
    });
}

/**
 * @typedef CreateGameResponse
 * @property {number} placeId
 * @property {number} universeId
 */

/**
 * @typedef UserPlaceCountResponse
 * @property {number} universeCount
 */