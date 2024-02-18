import fs from "fs/promises";
import path from "path";

export async function hello() {

    const QUESTION_TEXT_PREFIX = "? ";


    type Project = {
        projectName: string;
        pages: Page[];
    };
    type Page = {
        title: string;
        lines: Array<{
            text: string;
        }>;
    };
    type FAQ = {
        question: string;
        pageTitle: string;
    };

    /**
     * Generate FAQs data.
     */
    const main = async (): Promise<void> => {
        const projectName = "takayaman2180";
        const titles = await getPageTitles(projectName);
        const faqs: FAQ[] = [];
        // do not run in parallel to avoid overloading the Scrapbox API.
        for (const title of titles) {
            faqs.push(...(await convertPageToFaqs(projectName, title)));
        }
        await storageFaqs(faqs);
        console.log("generate faqs successfully!");
    };

    /**
     * Returns the page titles of the specified project.
     * @param projectName
     * @return page titles
     */
    const getPageTitles = async (projectName: string): Promise<string[]> => {
        const res = await fetch(`https://scrapbox.io/api/pages/${projectName}`);
        const project = (await res.json()) as Project;
        const pages = project.pages;
        return pages.map(page => page.title);
    };

    /**
     * Convert from text contained on a specific page to FAQs
     * @param projectName
     * @param pageTitle
     * @return faqs
     */
    const convertPageToFaqs = async (
        projectName: string,
        pageTitle: string,
    ): Promise<FAQ[]> => {
        const res = await fetch(
            `https://scrapbox.io/api/pages/${projectName}/${pageTitle}`,
        );
        const page = (await res.json()) as Page;
        const faqs = page.lines
            // exclude first line because it is page title.
            .slice(1)
            // exclude lines that are not the target of questions.
            .filter(line => line.text.trim().startsWith(QUESTION_TEXT_PREFIX))
            // remove prefix of question text.
            .map(line => line.text.replace(QUESTION_TEXT_PREFIX, ""))
            // expand Helpfeel Notation.
            .flatMap(expandTargetText => convertTextToQuestions(expandTargetText))
            // convert to FAQ.
            .map(question => {
                return {question, pageTitle};
            });
        return faqs;
    };

    const convertTextToQuestions = (text: string): string[] => {
        const matches = text.matchAll(/\((.+?)\)/g);
        const optionsList: string[][] = [];
        for (const match of matches) {
            optionsList.push(match[1].split("|"));
        }

        const combinations = generateCombinations(optionsList);

        return combinations.map(combination => {
            let result = text;
            for (const option of combination) {
                result = result.replace(/\((.+?)\)/, option);
            }
            return result;
        });
    };

    const generateCombinations = (optionsList: string[][]): string[][] => {
        let combinations: string[][] = [[]];

        for (const options of optionsList) {
            const temp: string[][] = [];
            for (const combination of combinations) {
                for (const option of options) {
                    temp.push(combination.concat(option));
                }
            }
            combinations = temp;
        }

        return combinations;
    };

    /**
     * Store FAQs in a file.
     * @param faqs
     */
    const storageFaqs = async (faqs: FAQ[]): Promise<void> => {
        console.log(faqs);

        for (const faq of faqs) {
            await fetch("https://wkwk-hack.takayaman2180.net/scrapquestion", {
                method: 'POST', // リクエストメソッド
                headers: {
                    'Content-Type': 'application/json', // コンテントタイプの指定
                },
                body: JSON.stringify(faq), // ボディのデータを文字列化
            })
        }

    };

    await main();
}
