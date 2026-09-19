import { useEffect, useRef, useState } from "react";
import { createUseStyles } from "react-jss";
import { getAvatar } from "../../../services/avatar";
import { getItemUrl } from "../../../services/catalog";
import ItemImage from "../../itemImage";
import PlayerImage from "../../playerImage";
import Subtitle from "./subtitle";
import Link from "../../link";
import { getAssetRestrictions } from "../../../services/develop";
import { Thumbnail3DHandler } from "../../thumbnail3D";
import UserProfileStore from "../stores/UserProfileStore";
import ActionButton from "../../actionButton";
import useButtonStyles from "../../../styles/buttonStyles";
import FeedbackStore from "../../../stores/feedback";
import { FeedbackType } from "../../../models/feedback";

const useAvatarStyles = createUseStyles({
    avatarImageWrapper: {
        maxWidth: "300px",
        margin: "0 auto",
        display: "block",
    },

    assetContainerCard: {
        background: "#3b7599",
        height: "100%",
        borderRadius: 0,
        border: "0!important",
    },

    avatarImageCard: {
        borderRadius: 0,
        border: 0,
        position: "relative",
        minHeight: 300,
    },

    pagination: {
        textAlign: "center",
        marginBottom: 0,
        color: "white",
        fontSize: "28px",
        fontFamily: "serif",

        "&>span": {
            cursor: "pointer",
        },
    },

    disabledPagination: {},

    restrictionsContainer: {
        position: "absolute",
        bottom: -3,
        left: -3,
        overflow: "hidden",
        borderBottomLeftRadius: 10.5,
    },

    thumbnail3DButtonContainer: {
        display: "flex",
        position: "absolute",
        top: 15,
        right: 15,
        zIndex: 3,
    },

    thumbnail3DButton: {
        padding: 9,
        fontSize: "18px!important",
        lineHeight: "100%!important",
        minHeight: 32,
    },

    avatarImageSpinner: {
        display: "flex",
        position: "absolute",
        bottom: 0,
        left: 0,
        right: 0,
        top: 0,
        height: "100%",
        width: "100%",
        zIndex: 2,
    },
});

const Avatar = props => {
    const s = useAvatarStyles();
    const buttonStyles = useButtonStyles();
    const { userId } = props;

    const assetsLimit = 8;

    const [assets, setAssets] = useState(null);
    const [selectedAssets, setSelectedAssets] = useState(null);
    const [assetPages, setAssetPages] = useState(1);
    const [assetPage, setAssetPage] = useState(1);

    const store = UserProfileStore.useContainer();
    const feedback = FeedbackStore.useContainer();

    const [thumbType, setThumbType] = useState(0);
    const [is3DReady, set3DReady] = useState(false);

    const canvasParentRef = useRef(null);
    const [thumb3D, setThumb3D] = useState(new Thumbnail3DHandler());

    useEffect(() => {
        let cancelled = false;

        const loadAvatar = async () => {
            try {
                const avatar = await getAvatar({ userId });

                if (cancelled) return;

                const avatarAssets = avatar?.assets || [];

                // Если предметов нет — не отправляем пустой assetIds запрос.
                if (avatarAssets.length === 0) {
                    setAssets([]);
                    setSelectedAssets([]);
                    setAssetPage(1);
                    setAssetPages(1);
                    return;
                }

                const assetIds = avatarAssets
                    .map(asset => asset?.id)
                    .filter(id => id !== null && id !== undefined && id !== "");

                let assetRestrictions = [];

                // Запрашиваем ограничения только если есть реальные ID.
                if (assetIds.length > 0) {
                    try {
                        assetRestrictions = await getAssetRestrictions(assetIds);
                    } catch (error) {
                        console.warn(
                            "Could not get asset restrictions.",
                            error
                        );
                    }
                }

                if (cancelled) return;

                const finalAssets = avatarAssets.map(asset => {
                    const restriction = assetRestrictions.find(
                        d => d.assetId === asset.id
                    );

                    return {
                        ...asset,
                        isLimited: restriction?.isLimited || false,
                        isLimitedUnique:
                            restriction?.isLimitedUnique || false,
                    };
                });

                setAssets(finalAssets);
                setSelectedAssets(
                    finalAssets.slice(0, assetsLimit)
                );
                setAssetPage(1);
                setAssetPages(
                    Math.max(
                        1,
                        Math.ceil(finalAssets.length / assetsLimit)
                    )
                );
            } catch (error) {
                console.warn(
                    "Could not load avatar assets.",
                    error
                );

                if (cancelled) return;

                setAssets([]);
                setSelectedAssets([]);
                setAssetPage(1);
                setAssetPages(1);
            }
        };

        if (userId) {
            loadAvatar();
        }

        return () => {
            cancelled = true;
        };
    }, [userId]);

    useEffect(() => {
        const load3D = async () => {
            if (
                thumbType === 1 &&
                !store?.userAv3D?.camera
            ) {
                await thumb3D.Stop();

                feedback.addFeedback(
                    "3D Render not available, please try again later",
                    FeedbackType.ERROR
                );

                setThumbType(0);
                return;
            }

            if (thumbType !== 1) {
                await thumb3D.Stop();
            } else if (
                thumbType === 1 &&
                !thumb3D.isLoadingThumbnail &&
                store?.userAv3D
            ) {
                await thumb3D.LoadThumbnail(
                    store.userAv3D,
                    canvasParentRef.current,
                    set3DReady
                );
            }
        };

        load3D();
    }, [thumbType, store.userId, userId]);

    useEffect(() => {
        if (
            typeof THREE !== "undefined" &&
            thumb3D.scene === null
        ) {
            thumb3D.Init(300);
        }

        return () => {
            thumb3D.Dispose();
            setThumb3D(new Thumbnail3DHandler());
            setThumbType(0);
        };
    }, [store.userId]);

    return (
        <div className="flex marginStuff">
            <div className="col-12">
                <Subtitle>Currently Wearing</Subtitle>
            </div>

            <div className="col-12 col-lg-6 pe-0">
                <div className={"card " + s.avatarImageCard}>
                    <div
                        className={s.avatarImageWrapper}
                        ref={canvasParentRef}
                    >
                        <PlayerImage
                            id={userId}
                            invisible={thumbType === 1}
                        />

                        {thumbType === 1 && !is3DReady ? (
                            <div className={s.avatarImageSpinner}>
                                <span
                                    className="spinner"
                                    style={{
                                        height: "100%",
                                        backgroundSize: "auto 36px",
                                    }}
                                />
                            </div>
                        ) : null}
                    </div>

                    <div
                        className={
                            s.thumbnail3DButtonContainer
                        }
                    >
                        <ActionButton
                            label={
                                thumbType === 1
                                    ? "2D"
                                    : "3D"
                            }
                            buttonStyle={
                                buttonStyles.newCancelButton
                            }
                            className={
                                s.thumbnail3DButton
                            }
                            onClick={() =>
                                setThumbType(
                                    thumbType === 1
                                        ? 0
                                        : 1
                                )
                            }
                        />
                    </div>
                </div>
            </div>

            <div className="col-12 col-lg-6 ps-0">
                <div
                    className={
                        "card " + s.assetContainerCard
                    }
                >
                    <div className="flex ps-4 pe-4 pt-4 pb-4">
                        {selectedAssets &&
                            selectedAssets.map(v => {
                                return (
                                    <div
                                        className="col-3 pt-2 ps-1 pe-1"
                                        key={v.id}
                                    >
                                        <div
                                            className="card"
                                            title={v.name}
                                        >
                                            <Link
                                                href={getItemUrl({
                                                    name: v.name,
                                                    assetId: v.id,
                                                })}
                                            >
                                                <a
                                                    title={v.name}
                                                    href={getItemUrl({
                                                        name: v.name,
                                                        assetId: v.id,
                                                    })}
                                                >
                                                    <ItemImage
                                                        id={v.id}
                                                        className="pt-0"
                                                    />
                                                </a>
                                            </Link>

                                            <div
                                                className={
                                                    s.restrictionsContainer
                                                }
                                            >
                                                {v.isLimitedUnique ? (
                                                    <span className="icon-limited-unique-label" />
                                                ) : v.isLimited ? (
                                                    <span className="icon-limited-label" />
                                                ) : null}
                                            </div>
                                        </div>
                                    </div>
                                );
                            })}
                    </div>

                    <div className="flex">
                        <div className="col-12">
                            {assetPages > 1 && (
                                <p className={s.pagination}>
                                    {[...new Array(assetPages)].map(
                                        (_, v) => {
                                            const disabled =
                                                v + 1 === assetPage;

                                            if (disabled) {
                                                return (
                                                    <span
                                                        key={v}
                                                        className={
                                                            s.disabledPagination
                                                        }
                                                    >
                                                        ●
                                                    </span>
                                                );
                                            }

                                            return (
                                                <span
                                                    key={v}
                                                    onClick={() => {
                                                        setAssetPage(
                                                            v + 1
                                                        );

                                                        const offset =
                                                            (v + 1) *
                                                                assetsLimit -
                                                            assetsLimit;

                                                        setSelectedAssets(
                                                            assets.slice(
                                                                offset,
                                                                offset +
                                                                    assetsLimit
                                                            )
                                                        );
                                                    }}
                                                >
                                                    ○
                                                </span>
                                            );
                                        }
                                    )}
                                </p>
                            )}
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default Avatar;