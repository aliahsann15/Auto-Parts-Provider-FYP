// 👉 Importing required modules from Next.js
import Image from "@/app/components/AppImage";

export default function AboutPage() {
    return (
        <>
            {/* 👉 About 1 Starts Here*/}
            <section className="px-4 py-12 max-w-7xl mx-auto">

                {/* 👉 Section: Heading and Subtext Starts */}
                <div className="text-center mb-12">
                    <h1 className="text-4xl font-bold text-black">About <span className="text-black">Us</span></h1>
                    <p className="text-gray-600 mt-4 max-w-xl mx-auto">
                        "Lorem ipsum dolor sit amet, consectetur adipiscing elit, sed do eiusmod tempor incididunt ut labore et dolore magna aliqua"
                    </p>
                </div>
                {/* 👉 Section: Heading and Subtext Ends */}

                {/* 👉 Section: Image + Description + Button Starts */}
                <div className="flex flex-col lg:flex-row items-center gap-10">

                    {/* 👉 Left Side Image Starts */}
                    <div className="w-full lg:w-1/2 rounded-2xl overflow-hidden">
                        <Image
                            src="/images/about1.png" // Replace this with your actual image path in public folder
                            alt="Car Headlight"
                            width={700}
                            height={500}
                            className="rounded-2xl w-full h-auto object-cover"
                        />
                    </div>
                    {/* 👉 Left Side Image Ends */}

                    {/* 👉 Right Side Text + Button Starts */}
                    <div className="w-full lg:w-1/2 text-gray-700">
                        <p className="mb-6">
                            Lorem ipsum dolor sit amet, consectetur adipiscing elit, sed do eiusmod tempor incididunt ut labore et dolore magna aliqua.
                            Ut enim ad minim veniam, quis nostrud exercitation ullamco laboris nisi ut aliquip ex ea commodo consequat. Duis aute irure dolor
                            in reprehenderit in voluptate velit esse cillum dolore eu fugiat nulla pariatur. Excepteur sint occaecat cupidatat non proident,
                            sunt in culpa qui officia deserunt mollit anim id est laborum.
                        </p>

                        <p className="mb-8">
                            Lorem ipsum dolor sit amet, consectetur adipiscing elit, sed do eiusmod tempor incididunt ut labore et dolore magna aliqua.
                            Ut enim ad minim veniam, quis nostrud exercitation ullamco laboris nisi ut aliquip ex ea commodo consequat. Duis aute irure
                            dolor in reprehenderit in voluptate velit esse cillum
                        </p>

                        {/* 👉 Get in Touch Button */}
                        <button className="px-6 py-2 border-2 border-[#FFA500] text-[#FFA500] font-medium rounded-md hover:bg-[#FFA500] hover:text-white transition-all duration-300">
                            Get in Touch
                        </button>
                    </div>
                    {/* 👉 Right Side Text + Button Ends */}

                </div>
                {/* 👉 Section: Image + Description + Button Ends */}
            </section>
            {/* 👉 About 1 Ends */}

            {/* 👉 Section: Why Choose Us Starts */}
            <section className="px-4 pt-12 mb-24 max-w-7xl mx-auto">

                {/* 👉 Title and Subheading Starts */}
                <div className="text-center mb-12">
                    <h2 className="text-4xl font-bold text-black">Why Choose us</h2>
                    <p className="text-gray-600 mt-4 max-w-xl mx-auto">
                        "Lorem ipsum dolor sit amet, consectetur adipiscing elit, sed do eiusmod tempor incididunt ut labore et dolore magna aliqua"
                    </p>
                </div>
                {/* 👉 Title and Subheading Ends */}

                {/* 👉 Grid of Boxes Starts */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">

                    {/* 👉 Box 1 Starts */}
                    <div className="bg-[#FFA500] text-black rounded-xl flex py-8 px-5 items-center">
                        {/* Icon Placeholder */}
                        <div className=" rounded-full w-12 h-12 flex items-center justify-center mr-4">
                        <svg width="91" height="90" viewBox="0 0 91 90" fill="none" xmlns="http://www.w3.org/2000/svg" xmlnsXlink="http://www.w3.org/1999/xlink">
<rect x="0.5" width="90" height="90" fill="url(#pattern0_1646_62)"/>
<defs>
<pattern id="pattern0_1646_62" patternContentUnits="objectBoundingBox" width="1" height="1">
<use xlinkHref="#image0_1646_62" transform="scale(0.0111111)"/>
</pattern>
<image id="image0_1646_62" width="90" height="90" preserveAspectRatio="none" xlinkHref="data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAFoAAABaCAYAAAA4qEECAAAACXBIWXMAAAsTAAALEwEAmpwYAAAER0lEQVR4nO2dT4hVVRzHz5SmYtYmqCzQGF0Hk60qGkQLobAWFVhJWomgYDaEtgjaVa5koFaBK7dauRjRXZuiJsaZgYctNBeWTOPM6Mr3wOkTP95v4CHzxvfnnHN/597zgbd53HfuOV/OO/f8/pzfdS6TyWQymUwmk8lkMp0BPAg8D3wInAB+AKaAK8A80NDPvH43pdd8o7/ZJm10eLtqATwNfAKcA27TP7eAn4AjwFOuygDrgPeBi8Ai4bgLXADeA9a6qgA8rDPtb+LzL/Al8KgrK8Bq4DNgjuKRPoxIn1yZAF4CprHHZWCHSx1ZE4Fvgf+wi/RtFFjjUgTYDPxKOvwBbHEpIX9HT9u02Mi2cLtLAeBN4A7p0gDecZYBDgTeE8dCxvCxswjwhhoHZWEReNtZQtY1oE75aACvOAsAWxN98HXzgBwsWuQ1ui0qO+OF7rPVGKkKo0Wa1ZYtPt/IWF+OLfIqYJLqMR3VEaVeuKpyNKY/+SbV5aZoEEPoY0WP1AAjMdye/xQ9SgPckFBcSKH3Fj1CQ+wJKbQEUjNNxkKmBJTBM1fX58wT+jmmPo1uEQfakyGElryLMoi8a5mxHe+xvcMhhJbklpRpAK+3GdvjPbZ5JkSa1gIlFFkANvbY7oLX9DPNhSvVctEK8Hkf7T/nfKHJg2UVeVefQYt9PoWWrM5SLRcC8KqHQPJXzhfAj6RFI5LIfh+IiblE6xGWi1YmfAp9jTRoRJzJS1z1KbSFDFCLIguzPoXuxUStgshC3arQPwMHxXwFfk9wTQ4qtK+Iymlg4J7Y4/cJi+x96fjLU6c2L9P2Az2KbUFk7w9DH9u7ReChNu13K7YVkb1v7+Qcnw+2r3CPTsW2JLJ3g8WXCf4n8FgfYlsTWfjaqlOpJpGNFe41AHxnbAu3Eh9YdpNOdjmzLc7kJYasO/5rHc5sqzPZv+NfByNnqylgZj9rdCb7D2XpgORYMbHFNiyycMj5RuNqoc6o1FZaRowtF0vc7bbP3QxOqgRQtNgUL3K4BBodoJR9oEixsSFy8JSwtRHKP9TaiW1I5LBJjhGT0CclqeWe+75m6Ijdp0FF1gFviBRxmQG+EMsLOGUo728WWB9caBVbiopUlSNRRG5x2F+iekxHr1oDvJiPv0VCK7dUhZOxdG13RFmO75ad39pFh2KKPagH08vKAvCMswAwbMSQ8I24aHc6SwC7S1gY5S1nESmPY8iw6AeZMB85y2jJn5SXkbq5Ej/3Kf1zK9EH37BLCWAT8AvpMF54SZ8+99mjxi1I6dvJwvfJHs31SewhfXrBlQmajqij6mYsmlkNNq9yZQVYr4O8XoDAM1qo+xFXFWiGxd4Fzgc2dKTtMYnxVar0/HJIlQA9AXBW30bRL/Pa1qFgKQGpQzP9bAjYL5makg0kOcj6KpC5lteDzOl3E3qNXLtPf5tfD5LJZDKZTCaTyWQyrkP+Byfj0xVEmNiwAAAAAElFTkSuQmCC"/>
</defs></svg>
                        </div>
                        {/* Text Content */}
                        <div>
                            <h3 className="font-semibold text-lg">Get original parts</h3>
                            <p className="text-sm">
                                Lorem ipsum dolor sit amet, consectetur adipiscing elit, sed do eiusmod tempor incididunt ut labore et dolore magna aliqua.
                            </p>
                        </div>
                    </div>
                    {/* 👉 Box 1 Ends */}

                    {/* 👉 Box 2 Starts */}
                    <div className="bg-[#FFA500] text-black rounded-xl flex py-8 px-5 items-center">
                        <div className="rounded-full w-12 h-12 flex items-center justify-center mr-4">
                        <svg width="91" height="90" viewBox="0 0 91 90" fill="none" xmlns="http://www.w3.org/2000/svg" xmlnsXlink="http://www.w3.org/1999/xlink">
<rect x="0.5" width="90" height="90" fill="url(#pattern0_1646_66)"/>
<defs>
<pattern id="pattern0_1646_66" patternContentUnits="objectBoundingBox" width="1" height="1">
<use xlinkHref="#image0_1646_66" transform="scale(0.0111111)"/>
</pattern>
<image id="image0_1646_66" width="90" height="90" preserveAspectRatio="none" xlinkHref="data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAFoAAABaCAYAAAA4qEECAAAACXBIWXMAAAsTAAALEwEAmpwYAAAEmElEQVR4nO2cWchVVRSAj5lzQuZElGV/w0sKTmj1UihFURBEQUYlFBWSUQoiKYEPIhUp1EMRIiiGQRGRDQRBA1RWTkUIUkZUmkVl/ZnlUH6xuUv6sXvO2efs4Z5hfY8//91r7++eYZ219rlJoiiKoiiKoiiKoiiKoiiKonSD+BwDXgNuA0a5fCvABcDDwEfAQaAf+ABYBIyo1DceUfB24EFgouN8xwH3Au8DJzLifSf/NzipAjmTdeVzOeLOd5zjWJH2NvBPwTl8Blzrz1h1RB8D1gGzHOc1GrhdLjNmTFfeAmb4M1d8QUWPkCy+AKY6zGU4cBPwIvAn/jFrfQ6Y7NdiXNG/ApNKxB8CXAdslJtZDI4ATwBnhbEaVvSKAjFPA64EngF+oneYTGWpOZMKOpsMLAA2AF/bfuhvT5O+1CLWbGAtsI9q8Q1whzkAbMSe+uHYos9IGX8KsArYS/XZBVyTJ7bXooemjN94bEUf9xRvXOAvsrLEFn1xyvjf03Bii74hZfwtNBxb0T6eugzLU8afT8OJLfrdjJx5Bw0mtujjwPiUGH3Aj57imJvrl8CrwOPA3cDlwBipDvosKXgVfdRjzJUZcfoKHtmHgZ3AZuAR4BZTRwGG5aznVs9rqqToX9KO6gGXESPiFWC/xP4BeA94FlhsSprywDDIagHd48yLWDfpiWjD80kFAKbFSi1tJxTiNFuaVAA5M/YQmF6KPpF1vY6JKYVKHzEYthMxtdlQvOTaI0yZ85nAZcBdwGPmmpzz/6OAN0It0nbSfxGW34HVwHklhE4CrgYeAJ6WnuGBLjHMWTnfosFgmguNFX0Sk99+AqyRdtUc4EJJ+2bK35YDm4Bt8gUVHf+hnLUOknp4o0XH4sm0Av6ANS/z2ZRuq2jkrBiSs+4FvgpqbRZ9cnvB6Jy13+hj/baiQ7T1q4K5J0zIWf9Vrk+RKrrDV8BFObJnuhS9VPR/mJRweo7svrINZFvRpkrWBg6ZDneOi7Nlr14hVPT/MU/BN1tsqDTbgK1R0d0x+fMSi0f2d/As+g/ayaqsmrfsZrUqRqnofDZkPdjIZWSvL9HmJtFmtgAjM/xMyXNkJbrLwIOBF2gXH6fttBIn5q0Fv6Jl4GHAm7SL3cC5GTfHfu+iZfCRZq8G7WJnWpcdWB9E9IA7b6GcsgHcn+LizmCiJcAY2TfcFrZmdNXDiZYg4+Ua1gYOpTiYGFz0gEDBW/cVoN+rOId9Et/SwktHdIBLUjrRTWFRUhXkaelnmseutHdxeoZ0JX6jWZLPSaoIcEXNqn9HgHukKndQahgfys9OVOtIPhVgbo066f1JnQGuj735u9YZhQumRUT13ymsTkbhAp33qaO/Q1LbjMIF4L7Av2rTrIzCBWBJD2TWN6Nwgc6bVDGpd0bhAvBoRNH1zyhcAJ6KJLoZGUVZ6OyyT20DeaJZGUVZ6HTWNweU3LyMoix0XtZ5uaTMdmYUZQGGAq+XEN3ejCLyNoatvZ53LaH4NoZ2ZxQetjF8aiFZMwpPnfUdOZI1o/B0ZJ8OLJSMwvy+qWYUiqIoiqIoiqIoSQD+BWRUKbX+ob/xAAAAAElFTkSuQmCC"/>
</defs>
</svg>

                        </div>
                        <div>
                            <h3 className="font-semibold text-lg">Fulfil customer need</h3>
                            <p className="text-sm">
                                Lorem ipsum dolor sit amet, consectetur adipiscing elit, sed do eiusmod tempor incididunt ut labore et dolore magna aliqua.
                            </p>
                        </div>
                    </div>
                    {/* 👉 Box 2 Ends */}

                    {/* 👉 Box 3 Starts */}
                    <div className="bg-[#FFA500] text-black rounded-xl flex px-5 py-8 items-center">
                        <div className="rounded-full w-12 h-12 flex items-center justify-center mr-4">
                        <svg width="91" height="90" viewBox="0 0 91 90" fill="none" xmlns="http://www.w3.org/2000/svg" xmlnsXlink="http://www.w3.org/1999/xlink">
<rect x="0.5" width="90" height="90" fill="url(#pattern0_1646_64)"/>
<defs>
<pattern id="pattern0_1646_64" patternContentUnits="objectBoundingBox" width="1" height="1">
<use xlinkHref="#image0_1646_64" transform="scale(0.0111111)"/>
</pattern>
<image id="image0_1646_64" width="90" height="90" preserveAspectRatio="none" xlinkHref="data:image/png;base64,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"/>
</defs>
</svg>

                        </div>
                        <div>
                            <h3 className="font-semibold text-lg">Customer care</h3>
                            <p className="text-sm">
                                Lorem ipsum dolor sit amet, consectetur adipiscing elit, sed do eiusmod tempor incididunt ut labore et dolore magna aliqua.
                            </p>
                        </div>
                    </div>
                    {/* 👉 Box 3 Ends */}

                    {/* 👉 Box 4 Starts */}
                    <div className="bg-[#FFA500] text-black rounded-xl flex px-5 py-8 items-center">
                        <div className=" rounded-full w-12 h-12 flex items-center justify-center mr-4">
                        <svg width="91" height="90" viewBox="0 0 91 90" fill="none" xmlns="http://www.w3.org/2000/svg" xmlnsXlink="http://www.w3.org/1999/xlink">
<rect x="0.5" width="90" height="90" fill="url(#pattern0_1646_65)"/>
<defs>
<pattern id="pattern0_1646_65" patternContentUnits="objectBoundingBox" width="1" height="1">
<use xlinkHref="#image0_1646_65" transform="scale(0.0111111)"/>
</pattern>
<image id="image0_1646_65" width="90" height="90" preserveAspectRatio="none" xlinkHref="data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAFoAAABaCAYAAAA4qEECAAAACXBIWXMAAAsTAAALEwEAmpwYAAAENElEQVR4nO2dT4hVVRjAz8wE40zjqNSmP5sKQggxadEmI6WVYpQLK1IxRF20EDRJpEULFxXRDE1QD9FaBhOBG23pYkKGCCcKEinwv87IOFMq05spf3LwezDN3Pfe7b777vnOuecHA7N4997v/N65373n3O/cZ4wCgB5gCJgCpuX/HtdxBQcwyGI+dR1XcADXE0SPu44rOKiD67iCgyg6ilaH3DlUgNvADeBjoDvltlMJnfpmym27gU+ASTl2Jeg7FmngQk6kkQ18nrDtZykl22MspGJCBOgAbtVJtSeayZaz4Uvgjvx90axXNpBs+cuEim1cvYsa6Xu2/cI6UnyukWTLdIb4nwaOAOcl9f0A7AY6jSaAARozmOOx7MixEf9rsAO8Ivk9ie+BJUYLKXrZrTS9NcVxOiW9tHT2zNvfa8Bsky9uyGiiieyZPE5DET1ToGRLFVhhPJF9LMdjfFWg5BrrjDZE9qCkixkrGejLcf99IntGjjHQZsmW9UYrae8ispJl3xkl/wM8nDnQskE2yZZh17GXQfI14HHX8XsBsBH4O4PkCWCV6/i9gCi5/UTJBQBszpiTY7pIS5RcAFFyAUTJBRCkZGA1sEUmxt8E1gK9Hg5GJlRKBjYAv9cJeg44BWwr8uEoAUreBfybshFXgO3tnFAKMl1Ig+5maNBxYGmbYgqrJ1uAX8jOz8AjiiTb54NbgR3As0YTMoPVCj/mdbFsIV3Yx1G/JqS/08BKowGpuWiVikPJzRgHnsjHVmsN7AdGc2jQJoWSa3xnNAAsy0H2pSwXxwIkI/t3Nhb4D8DyHGQPKJRc40mjhRxkzwFrFEq2F8l+o4kcZI82K6YpWLJlxGgkB9lvK5JsB2MvG62I7D8yNu4K8KACyZbD8thrt8znLIrLOSkqOxvxgQLJF2S1wHzsCoQ9RhPA6y008g7wmEPJzdhntAA82mJjvlYqGakF0VM802COOu1t1Sx6ecdoQXplqHxktADsJFz2Gy3IQptQecYoq4NOWjjvO98YbQDfEhZjwEuSFt8CnjIaAPYSDreBcwnD9GHgIdein6Mc/OR03hroarJ6NiQOORMtsu0q0zIw5lr0+5SDSdein6ccnNVwP23nmUNn0KlokW3ftREyf6qY0bNlVhnr9HzAVjttMFoAThKm5FeNJoAXAuvVVVscaTQCHCUMqup6ckIJ2WX8pqpacg37MhEJ1kf0poskgDc8zNd+9OSFAAfxB7968kKAA+jHz57smexqEJJrAO+ij7AkK5UdpmRlssOWrER2OSQ7ll0uyY5kl1NywbLLLbkg2VHyfGz1ZpTsp+xqTBcNsIt1clgJMKl6WZsWgBeBqxkln1FTAeoDQC/wnv0BnJSCL8p6wQdcx+4l3P+tlo1SNzIiC0ltavhNXpr1obytrMt1rJFIJBKJRCKRSCRifOIeaUU+wDfQ7xsAAAAASUVORK5CYII="/>
</defs>
</svg>

                        </div>
                        <div>
                            <h3 className="font-semibold text-lg">Easy to use</h3>
                            <p className="text-sm">
                                Lorem ipsum dolor sit amet, consectetur adipiscing elit, sed do eiusmod tempor incididunt ut labore et dolore magna aliqua.
                            </p>
                        </div>
                    </div>
                    {/* 👉 Box 4 Ends */}

                </div>
                {/* 👉 Grid of Boxes Ends */}
            </section>
            {/* 👉 Section: Why Choose Us Ends */}

            {/* 👉 Section: Final Call-to-Action Starts */}
<section className="bg-gray-100 py-16 px-4">
  <div className="text-center max-w-xl mx-auto">

    {/* 👉 Heading */}
    <h2 className="text-3xl sm:text-4xl font-bold text-black">
      That’s all About us<br />
      <span className="text-black">feel free to say Hi!</span>
    </h2>

    {/* 👉 Subheading */}
    <p className="text-gray-600 mt-4">
      "Lorem ipsum dolor sit amet, consectetur adipiscing elit, sed do eiusmod tempor incididunt ut labore et dolore magna aliqua"
    </p>

    {/* 👉 Button */}
    <button className="mt-6 px-6 py-2 border-2 border-[#FFA500] text-[#FFA500] font-medium rounded-md shadow-md hover:bg-[#FFA500] hover:text-white transition-all duration-300">
      Get in Touch
    </button>

  </div>
</section>
{/* 👉 Section: Final Call-to-Action Ends */}


        </>
    );
}
