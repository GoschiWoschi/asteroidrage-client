import { useEffect } from "react"

export default function FacebookLogin(appId: string) {

    useEffect(() => {
        window["fbAsyncInit"] = function () {
            window["FB"].init({
                appId,
                xfbml: true,
                version: 'v10.0'
            });
            window["FB"].AppEvents.logPageView();
            window["FB"].getLoginStatus(function (response: any) {
                console.log(response)
            });
        };

        (function (d, s, id) {
            var js, fjs = d.getElementsByTagName(s)[0];
            if (d.getElementById(id)) { return; }
            js = d.createElement(s); js.id = id;
            js.src = "https://connect.facebook.net/en_US/sdk.js";
            fjs.parentNode.insertBefore(js, fjs);
        }(document, 'script', 'facebook-jssdk'));
    }, [])

    return null

}