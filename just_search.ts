const JustWatch = require('justwatch-api');
var ptn = require('parse-torrent-name');
const fs = require('fs');

const locale = 'it_IT';
const source_list_file = 'titles.txt';
const output_json = 'database.json';
const output_action = 'actions.sh';

const jw = new JustWatch({
    locale
});

function is_available(offers: any)
{
    if(!offers)
        return false;

    const availability = offers.map((offer: any) =>
    {
        offer.value = offer.monetization_type === 'flatrate' && offer.urls && offer.urls.standard_web && (offer.urls.standard_web.includes('netflix.com') || offer.urls.standard_web.includes('primevideo.com/'))
        return offer;
    });
    
    if(availability.some((element: any) => element.value === true))
        return availability.find((element: any) => element.value === true);
    
    return undefined;
}

const data_titles = fs.readFileSync(source_list_file, 'UTF-8');

const titles = data_titles.split(/\r?\n/);
const database = {};

const promise = titles.map(async (title: string) =>
{
    return new Promise(async (resolve) =>
    {
        const nat_title = ptn(title);
        nat_title.title = nat_title.title.replace('ITA ENG', '').trim();
        database[title] = {
            title: nat_title.title,
            available: false,
        };

        try
        {
            const result = await jw.search({query: nat_title.title});

            if(result.items && result.items.length > 0)
            {
                const available = is_available(result.items[0].offers);
                if(available)
                {
                    database[title] = {
                        title: nat_title.title, 
                        parsed_title: result.items[0].title,
                        available: true,
                        url: available.urls.standard_web
                    };
                }
            }

            return resolve();
        }
        catch(error)
        {
            console.error(error);
            return resolve();
        }
    });
});

Promise.all(promise).then(async () => 
{
    await fs.writeFileSync(output_json, JSON.stringify(database));
    let actions = ''; 
    Object.keys(database).map((title) => 
    {
        if(database[title].available)
        {
            actions += `rm -rf "${title}"\n`;
        }
    });
    await fs.writeFileSync(output_action, actions);
});