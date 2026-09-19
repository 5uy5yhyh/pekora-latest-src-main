using System.Diagnostics;
using Microsoft.AspNetCore.Mvc;
using Roblox.Dto.Thumbnails;
using Roblox.Exceptions;
using Roblox.Logging;
using Roblox.Models;
using Roblox.Models.Thumbnails;
using Roblox.Services;
using Roblox.Website.WebsiteModels.Thumbnails;
using ServiceProvider = Roblox.Services.ServiceProvider;

namespace Roblox.Website.Controllers;

[ApiController]
[Route("/apisite/thumbnails/v1")]
public class ThumbnailsControllerV1 : ControllerBase
{
    public static void StartThumbnailFixLoop()
    {
#if DEBUG
        return;
#endif

        Task.Run(async () =>
        {
            while (true)
            {
                try
                {
                    await Task.Delay(TimeSpan.FromSeconds(10));
                    await ThumbnailFixTask();
                }
                catch (Exception e)
                {
                    Writer.Info(
                        LogGroup.FixBrokenThumbnails,
                        "Failure in Fix: {0}\n{1}",
                        e.Message,
                        e.StackTrace
                    );
                }

                await Task.Delay(TimeSpan.FromMinutes(5));
            }
        });
    }

    private static async Task ThumbnailFixTask()
    {
#if !DEBUG
        await using var distributedThumbFixLock =
            await Roblox.Services.Cache.redLock.CreateLockAsync(
                "FixThumbnailsV1",
                TimeSpan.FromMinutes(10)
            );

        if (!distributedThumbFixLock.IsAcquired)
        {
            Writer.Info(
                LogGroup.FixBrokenThumbnails,
                "could not acquire lock for thumb fix"
            );
            return;
        }

        Writer.Info(
            LogGroup.FixBrokenThumbnails,
            "Acquired lock for fixing thumbnails"
        );

        try
        {
            await FixAssetThumbnails();
        }
        catch (Exception e)
        {
            Writer.Info(
                LogGroup.FixBrokenThumbnails,
                "Error running FixAssetThumbnails(): {0}\n{1}",
                e.Message,
                e.StackTrace
            );
        }

        try
        {
            await FixUserThumbnails();
        }
        catch (Exception e)
        {
            Writer.Info(
                LogGroup.FixBrokenThumbnails,
                "Error running FixUserThumbnails(): {0}\n{1}",
                e.Message,
                e.StackTrace
            );
        }
#endif
    }

    private static async Task FixUserThumbnails()
    {
        using var thumbs =
            ServiceProvider.GetOrCreate<ThumbnailsService>();

        using var avatar =
            ServiceProvider.GetOrCreate<AvatarService>();

        var brokenIds =
            (await thumbs.GetUserIdsWithBrokenThumbnails())
            .Distinct()
            .ToList();

        Writer.Info(
            LogGroup.FixBrokenThumbnails,
            "Got users with broken thumbs. Broken = {0}",
            brokenIds.Count
        );

        foreach (var userId in brokenIds)
        {
            try
            {
                await Task.Delay(TimeSpan.FromSeconds(1));

                await using var isLocked =
                    await Roblox.Services.Cache.redLock.CreateLockAsync(
                        avatar.GetAvatarRedLockKey(userId),
                        TimeSpan.FromMinutes(5)
                    );

                if (!isLocked.IsAcquired)
                    continue;

                var av = await avatar.GetAvatar(userId);

                if (
                    av.headshotUrl != null &&
                    av.thumbnailUrl != null
                )
                {
                    continue;
                }

                Writer.Info(
                    LogGroup.FixBrokenThumbnails,
                    "Rendering thumbnail for user {0}",
                    userId
                );

                await avatar.RedrawAvatar(
                    userId,
                    null,
                    null,
                    null,
                    true,
                    true
                );
            }
            catch (Exception e)
            {
                Writer.Info(
                    LogGroup.FixBrokenThumbnails,
                    "Error fixing user {0}: {1}\n{2}",
                    userId,
                    e.Message,
                    e.StackTrace
                );
            }
        }
    }

    private static async Task FixAssetThumbnails()
    {
        var services = new ControllerServices();

        var itemsToFix =
            (await services.thumbnails.GetAssetIdsWithoutThumbnail())
            .ToList();

        foreach (var item in itemsToFix)
        {
            await Task.Delay(TimeSpan.FromSeconds(1));

            using var cancellation =
                new CancellationTokenSource();

            cancellation.CancelAfter(
                TimeSpan.FromMinutes(2)
            );

            Writer.Info(
                LogGroup.FixBrokenThumbnails,
                "Fixing asset {0}:{1}",
                item.assetId,
                item.assetType
            );

            try
            {
                await services.assets.RenderAssetAsync(
                    item.assetId,
                    item.assetType,
                    cancellation.Token
                );
            }
            catch (Exception e)
            {
                Writer.Info(
                    LogGroup.FixBrokenThumbnails,
                    "Error fixing asset {0}: {1}\n{2}",
                    item.assetId,
                    e.Message,
                    e.StackTrace
                );
            }
        }
    }

    private static List<long> ParseIds(string? ids)
    {
        if (string.IsNullOrWhiteSpace(ids))
            return new List<long>();

        return ids
            .Split(
                ',',
                StringSplitOptions.RemoveEmptyEntries
            )
            .Select(long.Parse)
            .Distinct()
            .ToList();
    }

    private static string? FixImageUrl(string? imageUrl)
    {
        if (string.IsNullOrWhiteSpace(imageUrl))
            return null;

        if (
            imageUrl.StartsWith(
                "http://",
                StringComparison.OrdinalIgnoreCase
            )
            ||
            imageUrl.StartsWith(
                "https://",
                StringComparison.OrdinalIgnoreCase
            )
        )
        {
            return imageUrl;
        }

        return Configuration.BaseUrl +
               (
                   imageUrl.StartsWith("/")
                       ? imageUrl
                       : "/" + imageUrl
               );
    }

    [HttpGet("users/avatar-headshot")]
    public async Task<RobloxCollection<ThumbnailEntry>> GetUserHeadshots(
        string? userIds
    )
    {
        var parsed = ParseIds(userIds);

        if (parsed.Count > 200)
            throw new BadRequestException();

        if (parsed.Count == 0)
        {
            return new()
            {
                data = Array.Empty<ThumbnailEntry>()
            };
        }

        var result =
            (
                await services.thumbnails
                    .GetUserHeadshots(parsed)
            ).ToList();

        foreach (var item in result)
            item.imageUrl =
                FixImageUrl(item.imageUrl);

        return new()
        {
            data = result
        };
    }

    [HttpGet("users/avatar")]
    public async Task<RobloxCollection<ThumbnailEntry>> GetUserThumbnails(
        string? userIds
    )
    {
        var parsed = ParseIds(userIds);

        if (parsed.Count > 200)
            throw new BadRequestException();

        if (parsed.Count == 0)
        {
            return new()
            {
                data = Array.Empty<ThumbnailEntry>()
            };
        }

        var result =
            (
                await services.thumbnails
                    .GetUserThumbnails(parsed)
            ).ToList();

        foreach (var item in result)
            item.imageUrl =
                FixImageUrl(item.imageUrl);

        /*
         * IMPORTANT:
         * GetUserThumbnails can return:
         *
         * targetId = userId
         * state = Pending
         * imageUrl = null
         *
         * In this situation the user IS present in the result,
         * so we must still ask AvatarService/RCCService to render it.
         */
        foreach (
            var item in result.Where(
                x => string.IsNullOrWhiteSpace(x.imageUrl)
            )
        )
        {
            _ = Task.Run(async () =>
            {
                try
                {
                    Writer.Info(
                        LogGroup.FixBrokenThumbnails,
                        "Starting avatar render for user {0}",
                        item.targetId
                    );

                    await services.avatar.RedrawAvatar(
                        item.targetId,
                        null,
                        null,
                        null,
                        true,
                        true
                    );

                    Writer.Info(
                        LogGroup.FixBrokenThumbnails,
                        "Avatar render requested for user {0}",
                        item.targetId
                    );
                }
                catch (Exception e)
                {
                    Writer.Info(
                        LogGroup.FixBrokenThumbnails,
                        "Avatar render failed for user {0}: {1}\n{2}",
                        item.targetId,
                        e.Message,
                        e.StackTrace
                    );
                }
            });
        }

        return new()
        {
            data = result
        };
    }

    [HttpGet("users/avatar-3d")]
    public async Task<RobloxCollection<ThumbnailEntry>> GetUserThumbnails3D(
        string? userIds
    )
    {
        var parsed = ParseIds(userIds);

        if (parsed.Count > 200)
            throw new BadRequestException();

        if (parsed.Count == 0)
        {
            return new()
            {
                data = Array.Empty<ThumbnailEntry>()
            };
        }

        var result =
            (
                await services.thumbnails
                    .GetUserThumbnails3D(parsed)
            ).ToList();

        foreach (var item in result)
            item.imageUrl =
                FixImageUrl(item.imageUrl);

        _ = Task.WhenAll(
            result
                .Where(v => v.imageUrl != null)
                .Select(
                    async v =>
                        await services.avatar
                            .Update3DRenderModified(
                                v.targetId,
                                Path.GetFileNameWithoutExtension(
                                    v.imageUrl!
                                ).Replace(
                                    "_thumbnail3d",
                                    ""
                                )
                            )
                )
        );

        foreach (
            var userId in result
                .Where(
                    x => string.IsNullOrWhiteSpace(x.imageUrl)
                )
                .Select(x => x.targetId)
        )
        {
            _ = Task.Run(async () =>
            {
                try
                {
                    await services.avatar.RedrawAvatar(
                        userId
                    );
                }
                catch
                {
                }
            });
        }

        return new()
        {
            data = result
        };
    }

    [HttpGet("assets")]
    public async Task<RobloxCollection<ThumbnailEntry>> GetAssetThumbnails(
        string? assetIds
    )
    {
        var parsed = ParseIds(assetIds);

        if (parsed.Count > 200)
            throw new BadRequestException();

        if (parsed.Count == 0)
        {
            return new()
            {
                data = Array.Empty<ThumbnailEntry>()
            };
        }

        var result =
            (
                await services.thumbnails
                    .GetAssetThumbnails(parsed)
            ).ToList();

        foreach (var item in result)
            item.imageUrl =
                FixImageUrl(item.imageUrl);

        return new()
        {
            data = result
        };
    }

    [HttpGet("users/outfits")]
    public async Task<RobloxCollection<ThumbnailEntry>>
        GetUserOutfitThumbnails(
            string? userOutfitIds
        )
    {
        var parsed = ParseIds(userOutfitIds);

        if (parsed.Count > 200)
            throw new BadRequestException();

        if (parsed.Count == 0)
        {
            return new()
            {
                data = Array.Empty<ThumbnailEntry>()
            };
        }

        var result =
            (
                await services.thumbnails
                    .GetUserOutfitThumbnails(parsed)
            ).ToList();

        foreach (var item in result)
            item.imageUrl =
                FixImageUrl(item.imageUrl);

        return new()
        {
            data = result
        };
    }

    [HttpGet("groups/icons")]
    public async Task<RobloxCollection<ThumbnailEntry>> GetGroupIcons(
        string? groupIds
    )
    {
        var parsed = ParseIds(groupIds);

        if (parsed.Count > 200)
            throw new BadRequestException();

        if (parsed.Count == 0)
        {
            return new()
            {
                data = Array.Empty<ThumbnailEntry>()
            };
        }

        var result =
            (
                await services.thumbnails
                    .GetGroupIcons(parsed)
            ).ToList();

        foreach (var item in result)
            item.imageUrl =
                FixImageUrl(item.imageUrl);

        return new()
        {
            data = result
        };
    }

    public static async Task<IEnumerable<dynamic>>
        MultiGetThumbnailsGeneric(
            List<BatchRequestEntry> thumbs,
            string type,
            Func<
                IEnumerable<long>,
                Task<IEnumerable<ThumbnailEntry>>
            > method
        )
    {
        var idList = thumbs
            .Where(c => c.type == type)
            .Select(c => c.targetId)
            .Distinct()
            .ToList();

        if (idList.Count == 0)
            return Array.Empty<dynamic>();

        var thumbnails =
            await method(idList);

        return thumbnails.Select(c => new
        {
            requestId =
                thumbs.Find(
                    v =>
                        v.targetId == c.targetId &&
                        v.type == type
                )?.requestId ?? string.Empty,

            targetId = c.targetId,

            state = c.state.ToString(),

            imageUrl =
                FixImageUrl(c.imageUrl),

            Url =
                FixImageUrl(c.imageUrl),

            version = c.version
        });
    }

    [HttpPost("batch")]
    public async Task<RobloxCollection<dynamic>>
        BatchThumbnailsRequest(
            IEnumerable<BatchRequestEntry> request
        )
    {
        var thumbs = request.ToList();

        var allResults =
            await Task.WhenAll(
                new List<
                    Task<IEnumerable<dynamic>>
                >
                {
                    MultiGetThumbnailsGeneric(
                        thumbs,
                        "AvatarThumbnail",
                        services.thumbnails
                            .GetUserThumbnails
                    ),

                    MultiGetThumbnailsGeneric(
                        thumbs,
                        "AvatarHeadShot",
                        services.thumbnails
                            .GetUserHeadshots
                    ),

                    MultiGetThumbnailsGeneric(
                        thumbs,
                        "GameIcon",
                        services.thumbnails
                            .GetUniverseIcons
                    ),

                    MultiGetThumbnailsGeneric(
                        thumbs,
                        "AssetThumbnail",
                        services.thumbnails
                            .GetAssetThumbnails
                    )
                }
            );

        return new RobloxCollection<dynamic>
        {
            data =
                allResults.SelectMany(
                    x => x
                )
        };
    }

    [HttpGet("games/icons")]
    public async Task<RobloxCollection<ThumbnailEntry>>
        GetUniverseIcons(
            string? universeIds
        )
    {
        var parsed = ParseIds(universeIds);

        if (parsed.Count > 200)
            throw new BadRequestException();

        if (parsed.Count == 0)
        {
            return new()
            {
                data = Array.Empty<ThumbnailEntry>()
            };
        }

        var result =
            await services.thumbnails
                .GetUniverseIcons(parsed);

        return new()
        {
            data =
                result
                    .Select(
                        c => new ThumbnailEntry
                        {
                            targetId =
                                c.targetId,

                            imageUrl =
                                FixImageUrl(
                                    c.imageUrl
                                ),

                            state =
                                c.state,

                            version =
                                c.version
                        }
                    )
                    .ToList()
        };
    }

    [HttpGet("places/gameicons")]
    public async Task<RobloxCollection<ThumbnailEntry>>
        GetPlaceIcons(
            string? placeIds
        )
    {
        var parsed = ParseIds(placeIds);

        if (parsed.Count > 200)
            throw new BadRequestException();

        if (parsed.Count == 0)
        {
            return new()
            {
                data = Array.Empty<ThumbnailEntry>()
            };
        }

        var result =
            await services.thumbnails
                .GetPlaceIcons(parsed);

        return new()
        {
            data =
                result
                    .Select(
                        c => new ThumbnailEntry
                        {
                            targetId =
                                c.targetId,

                            imageUrl =
                                FixImageUrl(
                                    c.imageUrl
                                ),

                            state =
                                c.state,

                            version =
                                c.version
                        }
                    )
                    .ToList()
        };
    }
}