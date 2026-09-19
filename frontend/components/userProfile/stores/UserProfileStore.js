import { useEffect, useState } from "react";
import { createContainer } from "unstated-next";
import getFlag from "../../../lib/getFlag";
import {
    getFollowersCount,
    getFollowingsCount,
    getFriends,
    getFriendStatus,
    isAuthenticatedUserFollowingUserId
} from "../../../services/friends";
import { getUserGames } from "../../../services/games";
import { getUserGroups } from "../../../services/groups";
import {
    getPreviousUsernames,
    getUserInfo,
    getUserStatus
} from "../../../services/users";
import FeedbackStore from "../../../stores/feedback";
import { getUserConnections } from "../../../services/accountInformation";

const UserProfileStore = createContainer(() => {
    const [userId, setUserId] = useState(null);
    const [username, setUsername] = useState(null);
    const [lastError, setLastError] = useState(null);
    const [userInfo, setUserInfo] = useState(null);
    const [userConns, setUserConns] = useState({});
    const [userAv3D, setUserAv3D] = useState(null);
    const [status, setStatus] = useState(null);
    const [previousNames, setPreviousNames] = useState(null);
    const [friends, setFriends] = useState(null);
    const [followersCount, setFollowersCount] = useState(null);
    const [followingsCount, setFollowingsCount] = useState(null);
    const [friendStatus, setFriendStatus] = useState(null);
    const [groups, setGroups] = useState(null);
    const [createdGames, setCreatedGames] = useState(null);
    const [tab, setTab] = useState("About");
    const [isFollowing, setIsFollowing] = useState(null);
    const [RAP, setRAP] = useState(null);
    const [verified, setVerified] = useState(false);

    const feedback = FeedbackStore.useContainer();

    useEffect(() => {
        if (!userId) return;

        getUserInfo({ userId })
            .then(result => {
                setUserInfo(result);
                setUsername(result.name);
            })
            .catch(() => {
                setLastError("InvalidUserId");
            });

        getPreviousUsernames({ userId })
            .then(setPreviousNames)
            .catch(() => {});

        if (getFlag("userProfileUserStatusEnabled", false)) {
            getUserStatus({ userId })
                .then(setStatus)
                .catch(() => {});
        }

        getFollowersCount({ userId })
            .then(setFollowersCount)
            .catch(() => {});

        getFollowingsCount({ userId })
            .then(setFollowingsCount)
            .catch(() => {});

        getFriends({ userId })
            .then(setFriends)
            .catch(() => {});

        getUserGroups({ userId })
            .then(setGroups)
            .catch(() => {});

        getUserGames({
            userId,
            cursor: ""
        })
            .then(d => {
                setCreatedGames(d.data);
            })
            .catch(() => {});

        isAuthenticatedUserFollowingUserId({ userId })
            .then(setIsFollowing)
            .catch(() => {});

        getUserConnections({
            userId,
            returnUrls: true
        })
            .then(setUserConns)
            .catch(() => {});

        // 3D avatar отключён, чтобы не было ошибки 400.
        setUserAv3D(null);
    }, [userId]);

    return {
        userId,
        setUserId,

        lastError,
        setLastError,

        username,
        RAP,
        userInfo,

        status,
        setStatus,

        previousNames,
        setPreviousNames,

        followersCount,
        setFollowersCount,

        followingsCount,
        setFollowingsCount,

        friends,
        setFriends,

        friendStatus,
        setFriendStatus,

        groups,
        setGroups,

        createdGames,
        setCreatedGames,

        tab,
        setTab,

        isFollowing,
        setIsFollowing,

        userConns,
        userAv3D,

        getFriendStatus: authenticatedUserId => {
            getFriendStatus({
                authenticatedUserId,
                userId
            })
                .then(setFriendStatus)
                .catch(() => {});
        }
    };
});

export default UserProfileStore;