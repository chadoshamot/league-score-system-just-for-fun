#include<cstdio>
#include<iostream>
#include<vector>
#include<map>

using namespace std;

map<string,pair<int, int>> guess;
map<string,pair<int, int>> result;


bool winLoseCheck(string name){
    if(guess.find(name) == guess.end() || result.find(name) == result.end()){
        printf("Error: Guess for %s not found.\n", name.c_str());
        return false;
    }
    int GuessWinLose = guess[name].first - guess[name].second;
    int ResultWinLose = result[name].first - result[name].second;
    if(GuessWinLose > 0 && ResultWinLose > 0){
        cout << name << " is predicted to left win and won" << endl;
        return true;
    }
    else if(GuessWinLose < 0 && ResultWinLose < 0){
        cout << name << " is predicted to left lose and lost" << endl;
        return true;
    }
    else if(GuessWinLose == 0 && ResultWinLose == 0){
        cout << name << " is predicted to draw and drew" << endl;
        return true;
    }
    else{
        cout << "Team " << name << " prediction is wrong" << endl;
        return false;
    }
}
int check(pair<string, pair<int, int>> g){
    if(result.find(g.first) == result.end()){
        printf("Error: Guess for %s not found in results.\n", g.first.c_str());
        return false;
    }
    else{
        bool WinOrLose = winLoseCheck(g.first);
        if(WinOrLose){
            if(g.second.first == result[g.first].first && g.second.second == result[g.first].second){
                printf("%s prediction is completely correct, add 5 points\n", g.first.c_str());
                return 5;
            }
            else if((g.second.first - g.second.second == result[g.first].first - result[g.first].second)
                    || (g.second.first == result[g.first].first && g.second.second != result[g.first].second)
                    || (g.second.first != result[g.first].first && g.second.second == result[g.first].second)){
                printf("%s prediction is partially correct as the exact score is not matched, add 3.5 points\n", g.first.c_str());
                return 4;
            }
            else if(g.second.first != result[g.first].first && g.second.second != result[g.first].second
                    && (g.second.first - g.second.second != result[g.first].first - result[g.first].second)){
                printf("%s prediction is literrally correct as all the scores are not matched, add 2 points\n", g.first.c_str());
                return 3;
            }
            else{
                printf("UNKNOWN MISTAKE, RECHECK YOUR INPUT!\n");
                return -1;
            }
        }
        else{
            if((g.second.first == result[g.first].first && g.second.second != result[g.first].second)
            || (g.second.first != result[g.first].first && g.second.second == result[g.first].second)){
                printf("%s prediction is literally wrong as the result is contradicting, add 1.5 points\n", g.first.c_str());
                return 2;
            }
            else if(g.second.first != result[g.first].first && g.second.second != result[g.first].second
                && (g.second.first - g.second.second != result[g.first].first - result[g.first].second)){
                printf("%s prediction is completely wrong as nothing is right, add 0 points\n", g.first.c_str());
                return 1;
            }
            else{
                printf("UNKNOWN MISTAKE, RECHECK YOUR INPUT!\n");
                return -1;
            }
        }
    }
}
int main(){
    
    string s;
    int left, right;
    printf("First Guess and enter the team using format: leftTeamName_rightTeamName leftScore rightScore\n");
    printf("When you want to end input just enter: 0 0 0\n");
    
    while(true){
        cin >> s >> left >> right;
        if(s == "0" && left == 0 && right == 0){
            break;
        }
        guess[s].first = left;
        guess[s].second = right;
        printf("Added prediction: %s %d %d\n", s.c_str(), left, right);
    }
    
    printf("Then enter the result using format: leftTeamName_rightTeamName leftScore rightScore\n");
    printf("Enter results for all teams you predicted:\n");
    
    for(auto& g : guess){
        printf("Enter result for %s: ", g.first.c_str());
        cin >> left >> right;
        result[g.first].first = left;
        result[g.first].second = right;
    }
    int guessSize = guess.size();
    int resultSize = result.size();
    if(guessSize != resultSize){
        printf("Error: your guess does not match the result.");
        return 0;
    }
    float ans = 0;
    for(auto& g : guess){
        int score = check(g);
        if(score == -1){
            printf("Error: Unknown mistake occurred while checking %s.\n", g.first.c_str());
        }
        else{
            switch(score){
                case 5:
                    ans += 5;
                    break;
                case 4:
                    ans += 3.5;
                    break;
                case 3:
                    ans += 2;
                    break;
                case 2:
                    ans += 1.5;
                    break;
                case 1:
                    ans += 0;
                    break;
                default:
                    break;
            }
        }
    }
    printf("Total score: %.1f\n", ans);
    getchar();
    return 0;
}