import {TestHelper} from "./websocketTest";

if(require.main === module){
    const testHelper: TestHelper = new TestHelper();
    testHelper.RunTests();
}