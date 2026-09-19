using System.Net;
using DSharpPlus.Entities;
using Newtonsoft.Json;
using Roblox.Logging;

#pragma warning disable IDE1006
#pragma warning disable CS8618

namespace Roblox.Libraries.DiscordApi;

public class DiscordApi
{
    private class DiscordHttpClient : HttpClient
    {
        public DiscordHttpClient(string token)
            : base(new HttpClientHandler
            {
                AutomaticDecompression = DecompressionMethods.All
            })
        {
            BaseAddress = new Uri("https://discord.com/api/");
            SetToken(token);
        }

        public void SetToken(string token)
        {
            DefaultRequestHeaders.Remove("Authorization");

            // Для OAuth token Discord используется Bearer.
            DefaultRequestHeaders.Add("Authorization", $"Bearer {token}");
        }
    }

    private readonly DiscordHttpClient discordClient;

    public string AccessToken { get; private set; }
    public string? RefreshToken { get; private set; }
    public int ExpiresIn { get; private set; }
    public string RedirectUri { get; private set; }

    public static async Task<DiscordApi?> CreateFromOAuthCode(
        string code,
        string redirectUri)
    {
        Console.WriteLine();
        Console.WriteLine("======================================");
        Console.WriteLine("       DISCORD OAUTH DEBUG");
        Console.WriteLine("======================================");

        Console.WriteLine($"Redirect URI: {redirectUri}");
        Console.WriteLine("OAuth code received: YES");

        try
        {
            var api = new DiscordApi(
                Configuration.DiscordOAuthToken,
                redirectUri
            );

            Console.WriteLine("Requesting Discord access token...");

            var tokenResponse = await api.RequestAccessToken(
                code,
                useRefreshToken: false
            );

            if (tokenResponse == null)
            {
                Console.WriteLine();
                Console.WriteLine("DISCORD OAUTH FAILED!");
                Console.WriteLine("Discord did not return an access token.");
                Console.WriteLine("======================================");
                Console.WriteLine();

                Writer.Info(
                    LogGroup.DiscordApi,
                    "Failed to get access token from OAuth code"
                );

                return null;
            }

            Console.WriteLine();
            Console.WriteLine("Discord OAuth token received successfully.");

            api.AccessToken = tokenResponse.accessToken;
            api.RefreshToken = tokenResponse.refreshToken;
            api.ExpiresIn = tokenResponse.expiresIn;

            api.discordClient.SetToken(api.AccessToken);

            Console.WriteLine($"Expires in: {api.ExpiresIn} seconds");
            Console.WriteLine("======================================");
            Console.WriteLine();

            Writer.Info(
                LogGroup.DiscordApi,
                "Discord OAuth access token received, expire time {0}",
                api.ExpiresIn
            );

            return api;
        }
        catch (Exception ex)
        {
            Console.WriteLine();
            Console.WriteLine("======================================");
            Console.WriteLine("DISCORD OAUTH EXCEPTION");
            Console.WriteLine("======================================");
            Console.WriteLine(ex.ToString());
            Console.WriteLine("======================================");
            Console.WriteLine();

            Writer.Info(
                LogGroup.DiscordApi,
                "Discord OAuth exception: {0}",
                ex.ToString()
            );

            return null;
        }
    }

    public DiscordApi(
        string accessToken,
        string redirectUri)
    {
        RedirectUri = redirectUri;
        AccessToken = accessToken;

        discordClient = new DiscordHttpClient(accessToken);
    }

    public async Task<DiscordUser?> GetUserInfo()
    {
        try
        {
            var response = await discordClient.GetAsync("users/@me");

            Console.WriteLine(
                $"Discord GetUserInfo: {(int)response.StatusCode} {response.StatusCode}"
            );

            if (!response.IsSuccessStatusCode)
            {
                string body = await response.Content.ReadAsStringAsync();

                Console.WriteLine($"Discord GetUserInfo response: {body}");

                Writer.Info(
                    LogGroup.DiscordApi,
                    "GetUserInfo failed with {0}: {1}",
                    response.StatusCode,
                    body
                );

                return null;
            }

            string content =
                await response.Content.ReadAsStringAsync();

            return JsonConvert.DeserializeObject<DiscordUser>(content);
        }
        catch (Exception ex)
        {
            Console.WriteLine(
                $"Discord GetUserInfo exception: {ex}"
            );

            return null;
        }
    }

    public async Task<DiscordMember?> GetGuildMember(ulong guildId)
    {
        try
        {
            var response = await discordClient.GetAsync(
                $"users/@me/guilds/{guildId}/member"
            );

            Console.WriteLine(
                $"Discord GetGuildMember: {(int)response.StatusCode} {response.StatusCode}"
            );

            if (!response.IsSuccessStatusCode)
            {
                string body =
                    await response.Content.ReadAsStringAsync();

                Console.WriteLine(
                    $"Discord GetGuildMember response: {body}"
                );

                Writer.Info(
                    LogGroup.DiscordApi,
                    "GetGuildMember failed with {0}: {1}",
                    response.StatusCode,
                    body
                );

                return null;
            }

            string content =
                await response.Content.ReadAsStringAsync();

            return JsonConvert.DeserializeObject<DiscordMember>(
                content
            );
        }
        catch (Exception ex)
        {
            Console.WriteLine(
                $"Discord GetGuildMember exception: {ex}"
            );

            return null;
        }
    }

    public async Task<bool> IsValid()
    {
        return await GetUserInfo() != null;
    }

    private async Task<DiscordTokenResponse?> RequestAccessToken(
        string codeOrRefreshToken,
        bool useRefreshToken)
    {
        try
        {
            Console.WriteLine();
            Console.WriteLine("----- DISCORD TOKEN REQUEST -----");
            Console.WriteLine($"Redirect URI: {RedirectUri}");
            Console.WriteLine(
                $"Grant type: {(useRefreshToken ? "refresh_token" : "authorization_code")}"
            );

            var form = new Dictionary<string, string>
            {
                {
                    "client_id",
                    Configuration.DiscordClientId.ToString()
                },
                {
                    "client_secret",
                    Configuration.DiscordClientSecret.ToString()
                },
                {
                    "grant_type",
                    useRefreshToken
                        ? "refresh_token"
                        : "authorization_code"
                },
                {
                    "redirect_uri",
                    RedirectUri
                },
                {
                    "scope",
                    "identify guilds.join"
                },
                {
                    useRefreshToken
                        ? "refresh_token"
                        : "code",
                    codeOrRefreshToken
                }
            };

            Console.WriteLine("Sending request to Discord...");

            var response = await discordClient.PostAsync(
                "oauth2/token",
                new FormUrlEncodedContent(form)
            );

            string body =
                await response.Content.ReadAsStringAsync();

            Console.WriteLine();
            Console.WriteLine("=== DISCORD OAUTH DEBUG ===");
            Console.WriteLine(
                $"Status: {(int)response.StatusCode} {response.StatusCode}"
            );
            Console.WriteLine($"Response: {body}");
            Console.WriteLine("============================");
            Console.WriteLine();

            if (!response.IsSuccessStatusCode)
            {
                Writer.Info(
                    LogGroup.DiscordApi,
                    "Failed to get access token: {0} - {1}",
                    response.StatusCode,
                    body
                );

                return null;
            }

            var result =
                JsonConvert.DeserializeObject<DiscordTokenResponse>(
                    body
                );

            if (result == null)
            {
                Console.WriteLine(
                    "Discord returned an invalid token response."
                );

                return null;
            }

            return result;
        }
        catch (Exception ex)
        {
            Console.WriteLine();
            Console.WriteLine("=== DISCORD TOKEN EXCEPTION ===");
            Console.WriteLine(ex.ToString());
            Console.WriteLine("================================");
            Console.WriteLine();

            Writer.Info(
                LogGroup.DiscordApi,
                "Discord token request exception: {0}",
                ex.ToString()
            );

            return null;
        }
    }
}
