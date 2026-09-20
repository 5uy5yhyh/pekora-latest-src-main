using MVC = Microsoft.AspNetCore.Mvc;
namespace Roblox.Website.Controllers
{

    [MVC.ApiController]
    [MVC.Route("/")]
    public class WellKnown : ControllerBase
    {
        [HttpGetBypass(".well-known/discord")]
        public string WellKnownDiscord()
        {
            return "No link for u";
        }

        [HttpGetBypass("oauth/.well-known/openid-configuration")]
        public dynamic WellKnownOpenIdConfiguration()
        {
            return new
            {
                issuer = "http://localhost:5000/oauth/",
                authorization_endpoint = "http://localhost:5000/oauth/v1/authorize",
                token_endpoint = "http://localhost:5000/oauth/v1/token",
                introspection_endpoint = "http://localhost:5000/oauth/v1/token/introspect",
                revocation_endpoint = "http://localhost:5000/oauth/v1/token/revoke",
                resources_endpoint = "http://localhost:5000/oauth/v1/token/resources",
                userinfo_endpoint = "http://localhost:5000/oauth/v1/userinfo",
                jwks_uri = "http://localhost:5000/oauth/v1/certs",
                registration_endpoint = "http://localhost:5000/dashboard/credentials",
                service_documentation = "http://localhost:5000/docs/reference/cloud",
                scopes_supported = new[]
                {
                    "openid",
                    "profile",
                    "email",
                    "verification",
                    "credentials",
                    "age",
                    "premium",
                    "roles",
                },
                response_types_supported = new[] { "none", "code" },
                subject_types_supported = new[] { "public" },
                id_token_signing_alg_values_supported = new[] { "ES256" },
                claims_supported = new[]
                {
                    "sub",
                    "type",
                    "iss",
                    "aud",
                    "exp",
                    "iat",
                    "nonce",
                    "name",
                    "nickname",
                    "preferred_username",
                    "created_at",
                    "profile",
                    "picture",
                    "email",
                    "email_verified",
                    "verified",
                    "age_bracket",
                    "premium",
                    "roles",
                    "internal_user",
                },
                token_endpoint_auth_methods_supported = new[]
                {
                    "client_secret_post",
                    "client_secret_basic",
                },
            };
        }
    }
}
