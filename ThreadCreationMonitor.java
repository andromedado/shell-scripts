import org.openjdk.btrace.core.annotations.*;
import static org.openjdk.btrace.core.BTraceUtils.*;

@BTrace
public class ThreadCreationMonitor {

    @OnMethod(
        clazz = "java.util.concurrent.Executors$DefaultThreadFactory",
        method = "newThread",
        location = @Location(Kind.ENTRY)
    )
    public static void onNewThreadEntry2() {
        println(">>> DefaultThreadFactory.newThread() called!");
        jstack();
        println("-------------------------------------");
    }

    @OnMethod(
        clazz = "com.dibs.lib.mvc.controller.HealthcheckController",
        method = "run",
        type = "com.dibs.service.common.ServiceResponse(java.util.Map)",
        location = @Location(Kind.ENTRY)
    )
    public static void onRun() {
        println("HealthcheckController.run() called!");
        jstack();
        println("-------------------------------------");
    }

    // --- NEW PROBE: Monitor ThreadPoolExecutor.addWorker ---
    // This method has arguments (Runnable, boolean).
    // Use @AnyType for arguments to match any type/number of arguments,
    // or specify the exact signature if you know it (e.g., Runnable.class, boolean.class).
    @OnMethod(
        clazz = "java.util.concurrent.ThreadPoolExecutor",
        method = "addWorker",
        location = @Location(Kind.ENTRY)
    )
    public static void onAddWorker(@ProbeClassName String pcn, @ProbeMethodName String pmn) {
        println(">>> ThreadPoolExecutor.addWorker() called!");
        jstack();
        println("-------------------------------------");
    }

    // You can keep the Thread.<init> and Thread.start if you want,
    // but focus your testing on addWorker.
    // They are less likely to work if they didn't before.

    // @OnMethod(
    //     clazz = "java.lang.Thread",
    //     method = "<init>",
    //     location = @Location(Kind.ENTRY)
    // )
    // public static void onThreadConstructed(@ProbeClassName String pcn, @ProbeMethodName String pmn) {
    //     println(">>> NEW THREAD CONSTRUCTED! " + pcn + "." + pmn + "()");
    //     jstack();
    //     println("-------------------------------------");
    // }

    // @OnMethod(
    //     clazz = "java.lang.Thread",
    //     method = "start",
    //     location = @Location(Kind.ENTRY)
    // )
    // public static void onThreadStart(@Self Thread self, @ProbeClassName String pcn, @ProbeMethodName String pmn) {
    //     println(">>> THREAD STARTED! ");
    //     jstack();
    //     println("-------------------------------------");
    // }
}