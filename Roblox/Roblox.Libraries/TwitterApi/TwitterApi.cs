using System.Text.Json;
using System.Text.Json.Serialization;

namespace Roblox.Libraries.TwitterApi;

public class TwitterPublicMetrics
{
    [JsonPropertyName("followers_count")]
    public long followersCount { get; set; }

    [JsonPropertyName("following_count")]
    public long followingsCount { get; set; }

    [JsonPropertyName("tweet_count")]
    public long tweetCount { get; set; }

    [JsonPropertyName("listed_count")]
    public long listedCount { get; set; }
}

public class TwitterUserObject
{
    [JsonPropertyName("id")]
    public string userId { get; set; } = string.Empty;

    [JsonPropertyName("description")]
    public string? description { get; set; }

    [JsonPropertyName("created_at")]
    public DateTime createdAt { get; set; }

    [JsonPropertyName("public_metrics")]
    public TwitterPublicMetrics? publicMetrics { get; set; }
}

public class GenericTwitterResponse<T>
{
    public IEnumerable<T>? data { get; set; }
}

public class TwitterRecordNotFoundException : Exception
{
}

public class TwitterApi
{
    private static string? authorization { get; set; }

    public static void Configure(string? newAuth)
    {
        // Twitter отключён для локального запуска Pekora
        authorization = newAuth ?? "disabled";
    }

    public async Task<TwitterUserObject> GetUserByScreenName(string screenName)
    {
        // Возвращаем пустого пользователя,
        // чтобы сайт работал без Twitter API

        return await Task.FromResult(new TwitterUserObject
        {
            userId = "0",
            description = "Twitter disabled",
            createdAt = DateTime.UtcNow,
            publicMetrics = new TwitterPublicMetrics
            {
                followersCount = 0,
                followingsCount = 0,
                tweetCount = 0,
                listedCount = 0
            }
        });
    }
}